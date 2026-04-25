/**
 * plugins/card-database/handlers/panelManager.js
 *
 * Manages the persistent main control panel in the database channel.
 * Buttons: "Add Category" and "Sync Database"
 */

'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');

const configManager = require('../../../bot/utils/configManager');
const logger = require('../../../utils/logger');


let panelMessageId = null;

function buildPanel() {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('🗃️ **Card Database — Control Panel**')
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '**Manage all card categories and cards from Discord.**\n\n' +
      '📁 **Add Category** — Create a new card category (thread)\n' +
      '🔄 **Sync Database** — Fetch all threads and rebuild the card cache\n\n' +
      '> *Only administrators can use these controls.*'
    )
  );

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

  return { 
    components: [container, row],
    flags: MessageFlags.IsComponentsV2
  };
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
    
    // 1. Check for the NEW V2 panel (type 20 is Container)
    const v2Panel = messages.find(m => 
      m.author.id === client.user.id && 
      m.components?.[0]?.type === 20
    );

    if (v2Panel) {
      panelMessageId = v2Panel.id;
      logger.info("CardDB", "V2 Main control panel found.");
      return;
    }

    // 2. Check for an OLD legacy panel and delete it to make room
    const oldPanel = messages.find(m => 
      m.author.id === client.user.id && 
      (m.embeds?.[0]?.title?.includes('Card Database') || m.components?.[0]?.components?.[0]?.customId === 'cdb_add_cat')
    );

    if (oldPanel) {
      logger.info("CardDB", "Old panel detected, purging for upgrade...");
      await oldPanel.delete().catch(() => {});
    }

    await sendPanel(channel);
    logger.info("CardDB", "Main control panel created.");
  } catch (err) {
    logger.error("CardDB", `ensurePanel error: ${err.message}`);
  }
}

function getPanelMessageId() {
  return panelMessageId;
}

module.exports = { ensurePanel, getPanelMessageId };
