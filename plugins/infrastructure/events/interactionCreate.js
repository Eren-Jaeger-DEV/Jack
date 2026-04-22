const { ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ActionRowBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');
const { buildSetupEmbed } = require('../services/setupService');
const logger = require('../../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.guild) return;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    // 1. Target Selection (Step 1)
    if (interaction.isStringSelectMenu() && interaction.customId === 'setup_target_select') {
      if (!isAdmin) return interaction.reply({ content: '❌ Admin only.', flags: [MessageFlags.Ephemeral] });

      const target = interaction.values[0];
      const isRole = target.toLowerCase().includes('role');

      const row = new ActionRowBuilder();
      if (isRole) {
        row.addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(`setup_finalize_role|${target}`)
            .setPlaceholder(`🎖️ Select Role for: ${target}`)
        );
      } else {
        row.addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(`setup_finalize_channel|${target}`)
            .setPlaceholder(`🔗 Select Channel for: ${target}`)
            .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildCategory])
        );
      }

      return interaction.reply({ 
        content: `Selected: **${target}**. Now pick the corresponding channel/role below:`, 
        components: [row], 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // 2. Finalize Channel Selection
    if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('setup_finalize_channel')) {
      await interaction.deferUpdate();
      const targetKey = interaction.customId.split('|')[1];
      const channelId = interaction.values[0];

      await updateSetting(interaction.guildId, targetKey, channelId);

      const embed = await buildSetupEmbed(interaction.guild);
      await interaction.editReply({ 
        content: `✅ Successfully linked **${targetKey}** to <#${channelId}>.`, 
        components: [], 
        embeds: [embed] 
      });
    }

    // 3. Finalize Role Selection
    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('setup_finalize_role')) {
      await interaction.deferUpdate();
      const targetKey = interaction.customId.split('|')[1];
      const roleId = interaction.values[0];

      await updateSetting(interaction.guildId, targetKey, roleId);

      const embed = await buildSetupEmbed(interaction.guild);
      await interaction.editReply({ 
        content: `✅ Successfully linked **${targetKey}** to role <@&${roleId}>.`, 
        components: [], 
        embeds: [embed] 
      });
    }
  }
};

async function updateSetting(guildId, key, value) {
  try {
    const config = await GuildConfig.findOne({ guildId });
    
    // Handle nested greeting data
    if (key === 'welcomeChannelId' || key === 'goodbyeChannelId') {
      if (!config.greetingData) config.greetingData = {};
      config.greetingData[key] = value;
      if (key === 'welcomeChannelId') config.greetingData.welcomeEnabled = true;
    } else {
      if (!config.settings) config.settings = {};
      config.settings[key] = value;
    }

    config.markModified('settings');
    config.markModified('greetingData');
    await config.save();
    
    logger.info("Infrastructure", `Updated ${key} to ${value} for guild ${guildId}`);
  } catch (err) {
    logger.error("Infrastructure", `Update failed: ${err.message}`);
  }
}
