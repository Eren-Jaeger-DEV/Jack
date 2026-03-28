const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const OverviewConfig = require('../models/OverviewConfig');

/**
 * Builds the control panel embed.
 */
function buildControlPanelEmbed(config) {
    const embed = new EmbedBuilder()
        .setTitle("🛠️ Overview Control Panel")
        .setDescription("Manage the server overview content from here.")
        .setColor("#FEE75C")
        .addFields({ name: "📊 Sections", value: config.sections.map(s => `• ${s.name} (${s.items.length} items)`).join('\n') || "None" })
        .setTimestamp();

    return embed;
}

/**
 * Builds the control panel buttons.
 */
function buildControlPanelButtons() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_section').setLabel('Add Section').setStyle(ButtonStyle.Primary),
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
        { upsert: true, new: true }
    );
}

module.exports = {
    buildControlPanelEmbed,
    buildControlPanelButtons,
    updateConfig
};
