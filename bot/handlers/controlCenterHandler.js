const { 
    buildHomeEmbed, 
    buildNavigationRow, 
    buildPluginsEmbed, 
    buildPluginSelect, 
    buildChannelsEmbed 
} = require('../utils/controlCenterUtils');
const configManager = require('../utils/configManager');
const logger = require('../utils/logger');

module.exports = async function controlCenterHandler(interaction, client) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('cc_')) return;

    // Check permissions (Admin only)
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Only Administrators can use the Control Center.', ephemeral: true });
    }

    const guildId = interaction.guildId;
    const config = await configManager.getGuildConfig(guildId);

    try {
        // --- NAVIGATION ---
        if (interaction.customId === 'cc_nav_home') {
            await interaction.update({
                embeds: [buildHomeEmbed(client, interaction.guild, config)],
                components: [buildNavigationRow()]
            });
        }

        else if (interaction.customId === 'cc_nav_plugins') {
            await interaction.update({
                embeds: [buildPluginsEmbed(config)],
                components: [buildNavigationRow(), buildPluginSelect(config)]
            });
        }

        else if (interaction.customId === 'cc_nav_channels') {
            await interaction.update({
                embeds: [buildChannelsEmbed(config)],
                components: [buildNavigationRow()]
            });
        }

        // --- PLUGIN TOGGLES ---
        else if (interaction.customId === 'cc_toggle_plugin') {
            const pluginName = interaction.values[0];
            const currentState = config.plugins[pluginName];
            const newState = !currentState;

            await configManager.updateGuildConfig(guildId, {
                [`plugins.${pluginName}`]: newState
            });

            // Refresh view
            const updatedConfig = await configManager.getGuildConfig(guildId);
            await interaction.update({
                embeds: [buildPluginsEmbed(updatedConfig)],
                components: [buildNavigationRow(), buildPluginSelect(updatedConfig)]
            });

            logger.info('ControlCenter', `Plugin '${pluginName}' toggled to ${newState ? 'ON' : 'OFF'} by ${interaction.user.tag}`);
        }

    } catch (err) {
        logger.error('ControlCenter', `Interaction failed: ${err.message}`);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
    }
};
