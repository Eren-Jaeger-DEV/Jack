/**
 * plugins/card-exchange/handlers/panelManager.js
 *
 * Manages the persistent "Card Exchange" panel message.
 * The panel always remains the latest message in the exchange channel.
 */

'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const EXCHANGE_CHANNEL_ID = '1486943351403184169';

// In-memory storage for the panel message ID
let panelMessageId = null;

/**
 * Build the panel embed and button row.
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🏆 CARD EXCHANGE HUB')
    .setDescription(
      'Welcome to the **Card Exchange Marketplace**!\n' +
      'Trade your collectible cards with other members efficiently.\n\n' +
      '📬 **Create Post**\n' +
      'List your own cards and specify what you are looking for.\n\n' +
      '🔍 **Search**\n' +
      'Quickly find a specific card or category in the market.\n\n' +
      '---'
    )
    .setColor(0xF1C40F) // Gold
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/8146/8146767.png') // Trading icon
    .setFooter({ text: 'CARD EXCHANGE SYSTEM', iconURL: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png' })
    .setTimestamp();




  const btnPost = new ButtonBuilder()
    .setCustomId('cex_post')
    .setLabel('Create Post')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📬');

  const btnSearch = new ButtonBuilder()
    .setCustomId('cex_search')
    .setLabel('Search')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🔍');

  const row = new ActionRowBuilder().addComponents(btnPost, btnSearch);

  return { embeds: [embed], components: [row] };
}

/**
 * Send a fresh panel to the exchange channel and store its message ID.
 * @param {import('discord.js').TextChannel} channel
 */
async function sendPanel(channel) {
  try {
    const msg = await channel.send(buildPanel());
    panelMessageId = msg.id;
    return msg;
  } catch (err) {
    console.error('[CardExchange] Failed to send panel:', err.message);
  }
}

/**
 * On bot start — ensure the panel exists in the exchange channel.
 * @param {import('discord.js').Client} client
 */
async function ensurePanel(client) {
  try {
    const channel = await client.channels.fetch(EXCHANGE_CHANNEL_ID).catch(() => null);
    if (!channel) return console.warn('[CardExchange] Exchange channel not found.');

    // Try to find an existing panel in the last 50 messages
    const messages = await channel.messages.fetch({ limit: 50 });
    const existing = messages.find(
      m => m.author.id === client.user.id &&
        m.embeds?.[0]?.title === '🏆 CARD EXCHANGE HUB'
    );

    if (existing) {
      panelMessageId = existing.id;
      console.log('[CardExchange] Panel found, ID stored.');
    } else {
      await sendPanel(channel);
      console.log('[CardExchange] Panel created.');
    }
  } catch (err) {
    console.error('[CardExchange] ensurePanel error:', err.message);
  }
}

/**
 * Re-post the panel to keep it at the bottom of the channel.
 * Called when a new message is detected in the exchange channel.
 * @param {import('discord.js').Client} client
 */
async function repostPanel(client) {
  try {
    const channel = await client.channels.fetch(EXCHANGE_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    // Delete old panel if it exists
    if (panelMessageId) {
      const old = await channel.messages.fetch(panelMessageId).catch(() => null);
      if (old) await old.delete().catch(() => { });
    }

    await sendPanel(channel);
  } catch (err) {
    console.error('[CardExchange] repostPanel error:', err.message);
  }
}

/**
 * Returns the current panel message ID.
 * @returns {string|null}
 */
function getPanelMessageId() {
  return panelMessageId;
}

module.exports = { ensurePanel, repostPanel, getPanelMessageId };
