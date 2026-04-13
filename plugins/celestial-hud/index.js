const hudService = require('./services/hudDataService');
const hudCommand = require('./commands/hud');
const logger = require('../../utils/logger');

/**
 * HUD PLUGIN lifecycle
 */
module.exports = {
  /**
   * Called by pluginLoader
   */
  async load(client) {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('hud_refresh_')) return;

      const userId = interaction.customId.split('_')[2];
      
      // Ownership check (Only the HUD owner should refresh)
      if (interaction.user.id !== userId) {
          return interaction.reply({ content: "❌ **Access Denied:** You cannot synchronize telemetry for another asset.", flags: 64 });
      }

      await interaction.deferUpdate();

      try {
          const user = await client.users.fetch(userId);
          const data = await hudService.getMemberHUDData(interaction.guild, userId);
          const embed = hudCommand.buildHUDEmbed(user, data);
          const row = hudCommand.buildHUDButtons(userId);

          await interaction.editReply({
              embeds: [embed],
              components: [row]
          });
      } catch (err) {
          logger.error("HUD", `Refresh failed for ${userId}: ${err.message}`);
      }
    });

    logger.info("HUD", "Neural Telemetry listener active.");
  }
};
