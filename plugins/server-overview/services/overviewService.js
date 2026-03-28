const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

/**
 * Builds the overview display embed.
 */
function buildOverviewEmbed(section = null) {
    const embed = new EmbedBuilder()
        .setTitle("🌐 Server Overview")
        .setColor("#5865F2")
        .setTimestamp();

    if (!section) {
        embed.setDescription("Welcome to the server! Please select a section from the dropdown below to view more information.");
    } else {
        embed.setTitle(`🌐 Overview: ${section.name}`);
        const content = section.items.map(i => `**${i.title}**\n${i.description}`).join('\n\n');
        embed.setDescription(content || "_No items in this section._");
    }

    return embed;
}

/**
 * Builds the overview selection dropdown.
 */
function buildOverviewDropdown(sections) {
    if (!sections || sections.length === 0) return null;

    const select = new StringSelectMenuBuilder()
        .setCustomId('overview_select')
        .setPlaceholder('Select a section to view...')
        .addOptions(sections.map(s => ({
            label: s.name,
            value: s.name
        })));

    return new ActionRowBuilder().addComponents(select);
}

module.exports = {
    buildOverviewEmbed,
    buildOverviewDropdown
};
