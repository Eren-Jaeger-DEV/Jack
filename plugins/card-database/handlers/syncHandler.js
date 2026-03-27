/**
 * plugins/card-database/handlers/syncHandler.js
 *
 * Core sync logic for MongoDB:
 *  - Reads all threads in the DB channel
 *  - Parses card messages
 *  - Upserts cards into MongoDB
 *  - Purges cards that no longer exist in Discord threads
 */

'use strict';

const {
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const Card = require('../../../bot/database/models/Card');

const DB_CHANNEL_ID  = '1486990546672291911';
const CARD_NAME_RE   = /^Name:\s*(.+)$/im;
const CARD_RARITY_RE = /^Rarity:\s*(.+)$/im;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function denyEphemeral(interaction, msg) {
  const payload = { content: msg, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
  return interaction.reply(payload).catch(() => {});
}

/**
 * Paginate all messages from a thread (newest first).
 */
async function fetchAllMessages(thread) {
  const all = [];
  let before = undefined;

  while (true) {
    const opts = { limit: 100 };
    if (before) opts.before = before;

    const batch = await thread.messages.fetch(opts).catch(() => null);
    if (!batch || batch.size === 0) break;

    all.push(...batch.values());
    before = batch.last()?.id;
    if (batch.size < 100) break;
  }

  return all;
}

/**
 * Parse a card message → { name, rarity, image } or null.
 */
function parseCard(message) {
  const content = message.content || '';

  const nameMatch   = CARD_NAME_RE.exec(content);
  const rarityMatch = CARD_RARITY_RE.exec(content);
  if (!nameMatch || !rarityMatch) return null;

  const name   = nameMatch[1].trim();
  const rarity = rarityMatch[1].trim();
  if (!name || !rarity) return null;

  const attachment = message.attachments?.first();
  if (!attachment) return null;

  return { name, rarity, image: attachment.url };
}

/* ─── Core Sync Engine ─────────────────────────────────────────────────────── */

/**
 * Full sync: fetch all threads, parse all cards, upsert into MongoDB, and purge old data.
 */
async function runSync(client) {
  const channel = await client.channels.fetch(DB_CHANNEL_ID).catch(() => null);
  if (!channel) throw new Error('Database channel not found.');

  const fetched = await channel.threads.fetchActive().catch(() => null);
  if (!fetched) throw new Error('Could not fetch active threads.');

  const processedIds = [];
  let totalCards = 0;
  let skipped    = 0;
  const categoriesFound = new Set();

  for (const [, thread] of fetched.threads) {
    const categoryName = thread.name;
    categoriesFound.add(categoryName);
    const seenInThread = new Set();

    const messages = await fetchAllMessages(thread);

    for (const msg of messages) {
      if (msg.system) continue;

      const cardData = parseCard(msg);
      if (!cardData) { skipped++; continue; }

      const key = cardData.name.toLowerCase();
      if (seenInThread.has(key)) { skipped++; continue; } 
      seenInThread.add(key);

      // MongoDB Upsert
      const doc = await Card.findOneAndUpdate(
        { name: cardData.name, category: categoryName },
        { $set: { rarity: cardData.rarity, image: cardData.image } },
        { upsert: true, returnDocument: 'after' }
      );

      processedIds.push(doc._id);
      totalCards++;
    }
  }

  // Purge cards missing from threads
  const purgeResult = await Card.deleteMany({ _id: { $nin: processedIds } });

  return { 
    categoryCount: categoriesFound.size, 
    totalCards, 
    skipped, 
    purged: purgeResult.deletedCount,
    threadCount: fetched.threads.size 
  };
}

/* ─── Silent Auto-Sync ─────────────────────────────────────────────────────── */
async function runSilentSync(client) {
  try {
    const result = await runSync(client);
    console.log(`[CardDB] MongoDB Auto-sync complete: ${result.totalCards} cards, ${result.purged} purged.`);
  } catch (err) {
    console.error('[CardDB] MongoDB Auto-sync failed:', err.message);
  }
}

/* ─── Button / Slash Command Handler ───────────────────────────────────────── */
async function handleSync(interaction, client) {
  if (!isAdmin(interaction.member)) {
    return denyEphemeral(interaction, '❌ Only administrators can sync the database.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await runSync(client);

    const embed = new EmbedBuilder()
      .setTitle('✅ MongoDB Synced')
      .setColor(0x2ECC71)
      .addFields(
        { name: '📁 Categories', value: `${result.categoryCount}`, inline: true },
        { name: '🃏 Cards',      value: `${result.totalCards}`,    inline: true },
        { name: '🗑️ Purged',     value: `${result.purged}`,        inline: true },
        { name: '🧵 Threads',    value: `${result.threadCount}`,   inline: true }
      )
      .setFooter({ text: 'Card data stored in MongoDB.' })
      .setTimestamp();

    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[CardDB] MongoDB Manual sync error:', err.message);
    await interaction.followUp({
      content: `❌ Sync failed: ${err.message}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = { handleSync, runSilentSync, fetchAllMessages, parseCard };
