const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * Build the main "Home" embed for the Control Center.
 */
function buildHomeEmbed(client, guild, config) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    return new EmbedBuilder()
        .setTitle('⚙️ Jack Bot Control Center')
        .setDescription(
            `Welcome to the centralized management hub for **${guild.name}**.\n` +
            `Use the buttons below to configure system-wide settings, plugins, and channel links.`
        )
        .addFields(
            { name: '🤖 Bot Status', value: '🟢 Online', inline: true },
            { name: '⏱️ Uptime', value: `${hours}h ${minutes}m`, inline: true },
            { name: '🧩 Plugins', value: `${Object.keys(config.plugins || {}).filter(k => config.plugins[k]).length} Active`, inline: true }
        )
        .setColor('#5865F2')
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Jack Management System • Premium Edition' });
}

/**
 * Build the primary navigation buttons.
 */
function buildNavigationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cc_nav_home')
            .setLabel('Home')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🏠'),
        new ButtonBuilder()
            .setCustomId('cc_nav_plugins')
            .setLabel('Plugins')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🧩'),
        new ButtonBuilder()
            .setCustomId('cc_nav_channels')
            .setLabel('Channels')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📡'),
        new ButtonBuilder()
            .setCustomId('cc_nav_roles')
            .setLabel('Roles')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👑')
    );
}

/**
 * Build the Plugin Management view.
 */
function buildPluginsEmbed(config) {
    const enabledCount = Object.keys(config.plugins || {}).filter(k => config.plugins[k]).length;
    const totalCount = Object.keys(config.plugins || {}).length;

    return new EmbedBuilder()
        .setTitle('🧩 Plugin Manager')
        .setDescription(`Manage which features are active in your server. (${enabledCount}/${totalCount} Active)`)
        .setColor('#7289DA')
        .setTimestamp();
}

/**
 * Build a select menu for toggling plugins.
 */
function buildPluginSelect(config) {
    const plugins = Object.keys(config.plugins || {}).sort().slice(0, 25); // Discord limit 25
    
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('cc_toggle_plugin')
            .setPlaceholder('Toggle a plugin on/off')
            .addOptions(plugins.map(p => ({
                label: p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '),
                value: p,
                description: config.plugins[p] ? '🟢 Currently Enabled' : '🔴 Currently Disabled',
                emoji: config.plugins[p] ? '✅' : '❌'
            })))
    );
}

/**
 * Build the Channel Setup view.
 */
function buildChannelsEmbed(config) {
    const settings = config.settings || {};
    const greeting = config.greetingData || {};

    const channelMap = [
        { name: 'Logging', id: settings.logChannelId },
        { name: 'Welcome', id: greeting.welcomeChannelId },
        { name: 'Registration', id: settings.registrationChannelId },
        { name: 'Classification', id: settings.classificationChannelId },
        { name: 'Synergy Logs', id: settings.synergyChannelId }
    ];

    const lines = channelMap.map(c => {
        const id = c.id;
        return `• **${c.name}:** ${id ? `<#${id}>` : '`Not Set` '}`;
    });

    return new EmbedBuilder()
        .setTitle('📡 Channel Configuration')
        .setDescription('Current channel links for major bot systems:\n\n' + lines.join('\n'))
        .setColor('#00FFCC')
        .setFooter({ text: 'Use the buttons below to update these channels.' });
}

module.exports = {
    buildHomeEmbed,
    buildNavigationRow,
    buildPluginsEmbed,
    buildPluginSelect,
    buildChannelsEmbed
};
