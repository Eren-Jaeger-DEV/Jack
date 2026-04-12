/**
 * plugins/card-database/handlers/panelManager.js
 *
 * Manages the persistent main control panel in the database channel.
 * Buttons: "Add Category" and "Sync Database"
 */

'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const configManager = require('../../../bot/utils/configManager');
const logger = require('../../../bot/utils/logger');


let panelMessageId = null;

function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🗃️ Card Database — Control Panel')
    .setDescription(
      '**Manage all card categories and cards from Discord.**\n\n' +
      '📁 **Add Category** — Create a new card category (thread)\n' +
      '🔄 **Sync Database** — Fetch all threads and rebuild the card cache\n\n' +
      '> Only administrators can use these controls.'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'Card Database CMS' })
    .setTimestamp();

  const addCatBtn = new ButtonBuilder()
    .setCustomId('cdb_add_cat')
    .setLabel('Add Category')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📁');

  const syncBtn = new ButtonBuilder()
    .setCustomId('cdb_sync')
    .setLabel('Sync Database')
    .setStyle(ButtonStyle.Success)
    .setEmoji('🔄');

  const row = new ActionRowBuilder().addComponents(addCatBtn, syncBtn);
  return { embeds: [embed], components: [row] };
}

async function sendPanel(channel) {
  try {
    const msg = await channel.send(buildPanel());
    panelMessageId = msg.id;
    return msg;
  } catch (err) {
    logger.error("CardDB", `Failed to send main panel: ${err.message}`);
  }
}

async function ensurePanel(client) {
  try {
    const GUILD_ID = process.env.GUILD_ID;
    if (!GUILD_ID) return;
    const config = await configManager.getGuildConfig(GUILD_ID);
    const dbChannelId = config?.settings?.cardDatabaseChannelId;
    if (!dbChannelId) return;

    const channel = await client.channels.fetch(dbChannelId).catch(() => null);
    if (!channel) return logger.warn("CardDB", "Database channel not found for panel check.");

    const messages = await channel.messages.fetch({ limit: 50 });
    const existing = messages.find(
      m =>
        m.author.id === client.user.id &&
        m.embeds?.[0]?.title === '🗃️ Card Database — Control Panel'
    );

    if (existing) {
      panelMessageId = existing.id;
      logger.info("CardDB", "Main control panel found.");
    } else {
      await sendPanel(channel);
      logger.info("CardDB", "Main control panel created.");
    }
  } catch (err) {
    logger.error("CardDB", `ensurePanel error: ${err.message}`);
  }
}

function getPanelMessageId() {
  return panelMessageId;
}

module.exports = { ensurePanel, getPanelMessageId };
