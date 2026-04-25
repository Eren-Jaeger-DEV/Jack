const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');
const OverviewConfig = require('../models/OverviewConfig');

/**
 * Builds the control panel container.
 */
function buildControlPanelContainer(config) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("🛠️ **Overview Control Panel**")
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Manage the server overview content from here.\n\n" +
        "**📊 Sections:**\n" +
        (config.sections.map(s => `• ${s.name} (${s.items.length} items)`).join('\n') || "None")
      )
    );

    return container;
}

/**
 * Builds the control panel buttons.
 */
function buildControlPanelButtons() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_section').setLabel('Add Section').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('delete_section').setLabel('Delete Section').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('add_item').setLabel('Add Item').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('edit_item').setLabel('Edit Item').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('delete_item').setLabel('Delete Item').setStyle(ButtonStyle.Danger)
    );

    return row;
}

/**
 * Handles database updates and validation logic.
 */
async function updateConfig(guildId, data) {
    return await OverviewConfig.findOneAndUpdate(
        { guildId },
        data,
        { upsert: true, returnDocument: 'after' }
    );
}

module.exports = {
    buildControlPanelContainer,
    buildControlPanelButtons,
    updateConfig
};
