const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

/**
 * Builds the overview display embed.
 */
function buildOverviewEmbed(guild, section = null) {
    const embed = new EmbedBuilder()
        .setTitle("🌐 Server Overview")
        .setColor("#5865F2")
        .setTimestamp();

    if (!section) {
        embed.setDescription(
            `**Welcome to ${guild?.name || 'our Server'}**\n\n` +
            `We’re glad to have you here. This server represents the official community of **JackPirates**, built to connect members, streamline communication, and enhance coordination.\n\n` +
            `To get started, please use the **Server Overview Panel** available in this channel.\n\n` +
            `**How to Navigate:**\n\n` +
            `* Select a category from the dropdown menu in the panel\n` +
            `* Each category provides relevant channels, information, and guidelines\n` +
            `* Follow the instructions within each section to access the appropriate areas\n\n` +
            `This system is designed to keep everything organized and easy to navigate. Please make sure to review the sections carefully before participating.\n\n` +
            `Thank you for being part of the community.`
        );
    } else {
        embed.setTitle(section.name);
        const content = section.items.map(i => `**${i.title}**\n${i.description}`).join('\n\n');
        embed.setDescription(content || "_No items in this section._");
    }

    return embed;
}

/**
 * Builds the overview selection dropdown.
 */
function buildOverviewDropdown(sections) {
    const activeSections = (sections || []).filter(s => s.items && s.items.length > 0);
    if (activeSections.length === 0) return null;

    const select = new StringSelectMenuBuilder()
        .setCustomId('overview_select')
        .setPlaceholder('Select a section to view...')
        .addOptions(activeSections.map(s => ({
            label: s.name,
            value: s.name
        })));

    return new ActionRowBuilder().addComponents(select);
}

module.exports = {
    buildOverviewEmbed,
    buildOverviewDropdown
};
