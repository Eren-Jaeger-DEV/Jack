/**
 * plugins/card-database/handlers/syncHandler.js
 *
 * Core sync logic shared by:
 *  - The "Sync Database" button / /card sync slash command
 *  - The auto-sync debounce system
 *
 * Reads all threads in the DB channel → parses card messages → saves via cardManager.
 */

'use strict';

const {
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { saveCards } = require('../../../utils/cardManager');

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
 * @param {import('discord.js').ThreadChannel} thread
 * @returns {Promise<import('discord.js').Message[]>}
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
 * @param {import('discord.js').Message} message
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
 * Full sync: fetch all threads, parse all cards, return result object.
 * Does NOT write the cache — callers do that so they can handle errors.
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ categories: object, totalCards: number, skipped: number, threadCount: number }>}
 */
async function runSync(client) {
  const channel = await client.channels.fetch(DB_CHANNEL_ID).catch(() => null);
  if (!channel) throw new Error('Database channel not found.');

  const fetched = await channel.threads.fetchActive().catch(() => null);
  if (!fetched) throw new Error('Could not fetch active threads.');

  const categories = {};
  let totalCards = 0;
  let skipped    = 0;

  for (const [, thread] of fetched.threads) {
    const categoryName = thread.name;
    const cards = [];
    const seen  = new Set();

    const messages = await fetchAllMessages(thread);

    for (const msg of messages) {
      if (msg.author.bot) continue;  // Skip bot/panel messages
      if (msg.system) continue;

      const card = parseCard(msg);
      if (!card) { skipped++; continue; }

      const key = card.name.toLowerCase();
      if (seen.has(key)) { skipped++; continue; } // duplicate

      seen.add(key);
      cards.push(card);
      totalCards++;
    }

    if (cards.length > 0) {
      categories[categoryName] = { cards };
    }
  }

  return { categories, totalCards, skipped, threadCount: fetched.threads.size };
}

/* ─── Silent Auto-Sync (called by event listeners) ────────────────────────── */
/**
 * Runs a sync without any interaction — used by the auto-sync debounce system.
 * Only logs errors. Does NOT overwrite cache on failure.
 * @param {import('discord.js').Client} client
 */
async function runSilentSync(client) {
  try {
    const result = await runSync(client);
    saveCards({ categories: result.categories });
    console.log(`[CardDB] Auto-sync complete: ${result.totalCards} cards across ${Object.keys(result.categories).length} categories.`);
  } catch (err) {
    console.error('[CardDB] Auto-sync failed (cache preserved):', err.message);
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
    saveCards({ categories: result.categories });

    const embed = new EmbedBuilder()
      .setTitle('✅ Database Synced')
      .setColor(0x2ECC71)
      .addFields(
        { name: '📁 Categories', value: `${Object.keys(result.categories).length}`, inline: true },
        { name: '🃏 Cards',      value: `${result.totalCards}`,                      inline: true },
        { name: '⏭️ Skipped',    value: `${result.skipped}`,                         inline: true },
        { name: '🧵 Threads',    value: `${result.threadCount}`,                     inline: true }
      )
      .setFooter({ text: 'Cache saved to /data/cardsCache.json' })
      .setTimestamp();

    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[CardDB] Manual sync error:', err.message);
    await interaction.followUp({
      content: `❌ Sync failed: ${err.message}\nExisting cache was NOT overwritten.`,
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = { handleSync, runSilentSync, fetchAllMessages, parseCard };
