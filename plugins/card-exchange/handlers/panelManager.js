/**
 * plugins/card-exchange/handlers/panelManager.js
 *
 * Manages the persistent "Card Exchange" panel message.
 * The panel always remains the latest message in the exchange channel.
 */

'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');

const configManager = require('../../../bot/utils/configManager');
const { addLog } = require('../../../utils/logger');

// In-memory storage for the panel message ID
let panelMessageId = null;

/**
 * Build the panel container and button row.
 * @returns {import('discord.js').BaseMessageOptions}
 */
function buildPanel() {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('🏆 **CARD EXCHANGE HUB**')
  );

  container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('https://cdn-icons-png.flaticon.com/512/8146/8146767.png')
      )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      'Welcome to the **Card Exchange Marketplace**!\n' +
      'Trade your collectible cards with other members efficiently.\n\n' +
      '📬 **Create Post**\n' +
      'List your own cards and specify what you are looking for.\n\n' +
      '🔍 **Search**\n' +
      'Quickly find a specific card or category in the market.\n\n' +
      '*CARD EXCHANGE SYSTEM*'
    )
  );

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

  return { 
    content: "",
    embeds: [],
    components: [container, row],
    flags: MessageFlags.IsComponentsV2
  };
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
    addLog("CardExchange", `Failed to send panel: ${err.message}`);
  }
}

/**
 * On bot start — ensure the panel exists in the exchange channel.
 * @param {import('discord.js').Client} client
 */
async function ensurePanel(client) {
  try {
    const GUILD_ID = process.env.GUILD_ID;
    if (!GUILD_ID) return;
    const config = await configManager.getGuildConfig(GUILD_ID);
    const exchangeChannelId = config?.settings?.cardExchangeChannelId;
    if (!exchangeChannelId) return;

    const channel = await client.channels.fetch(exchangeChannelId).catch(() => null);
    if (!channel) return console.warn('[CardExchange] Exchange channel not found.');

    // Try to find an existing panel in the last 50 messages
    const messages = await channel.messages.fetch({ limit: 50 });
    const existing = messages.find(
      m => m.author.id === client.user.id &&
        m.components?.[0]?.components?.[0]?.customId === 'cex_post' // Detect by custom ID instead of title
    );

    if (existing) {
      panelMessageId = existing.id;
      addLog("CardExchange", "Panel found, ID stored.");
    } else {
      await sendPanel(channel);
      addLog("CardExchange", "Panel created.");
    }
  } catch (err) {
    addLog("CardExchange", `ensurePanel error: ${err.message}`);
  }
}

/**
 * Re-post the panel to keep it at the bottom of the channel.
 * Called when a new message is detected in the exchange channel.
 * @param {import('discord.js').Client} client
 */
async function repostPanel(client) {
  try {
    const GUILD_ID = process.env.GUILD_ID;
    if (!GUILD_ID) return;
    const config = await configManager.getGuildConfig(GUILD_ID);
    const exchangeChannelId = config?.settings?.cardExchangeChannelId;
    if (!exchangeChannelId) return;

    const channel = await client.channels.fetch(exchangeChannelId).catch(() => null);
    if (!channel) return;

    // Delete old panel if it exists
    if (panelMessageId) {
      const old = await channel.messages.fetch(panelMessageId).catch(() => null);
      if (old) await old.delete().catch(() => { });
    }

    await sendPanel(channel);
  } catch (err) {
    addLog("CardExchange", `repostPanel error: ${err.message}`);
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
