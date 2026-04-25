const { 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');

/**
 * Builds the overview display container.
 */
function buildOverviewContainer(guild, section = null) {
    const container = new ContainerBuilder();

    if (!section) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Welcome to ${guild?.name || 'our Server'}`)
        );

        container.addSeparatorComponents(new SeparatorBuilder());

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `We’re glad to have you here. This server represents the community of **Jack**, built to connect members and streamline coordination.\n\n` +
                `**How to Navigate:**\n` +
                `* Select a category from the dropdown menu below.\n` +
                `* Each category provides relevant channels and guidelines.\n` +
                `* Follow instructions within each section to access areas.\n\n` +
                `*This system is designed to keep everything organized and easy to navigate.*`
            )
        );
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${section.name}`)
        );

        container.addSeparatorComponents(new SeparatorBuilder());

        const sectionContent = new SectionBuilder();
        const content = section.items.map(i => `**${i.title}**\n${i.description}`).join('\n\n');
        
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(content || "_No items in this section._")
        );
    }

    return container;
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
    buildOverviewContainer,
    buildOverviewDropdown
};
