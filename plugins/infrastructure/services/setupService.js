const { EmbedBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

/**
 * Builds the Infrastructure Health Report.
 */
async function buildSetupEmbed(guild) {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  const settings = config?.settings || {};
  const greeting = config?.greetingData || {};

  const getStatus = (val) => (val && val !== 'null' && val !== 'undefined') ? '✅' : '❌';

  const embed = new EmbedBuilder()
    .setTitle('🛰️ Neural Bridge — System Setup')
    .setColor('#5865F2')
    .setDescription('Select a **System** from the menu below, then map its channel or role.')
    .addFields(
      { name: '🛡️ Recruitment', value: `${getStatus(settings.classificationChannelId)} Classification Channel\n${getStatus(settings.clanMemberRoleId)} Clan Member Role`, inline: true },
      { name: '👋 Greetings', value: `${getStatus(greeting.welcomeChannelId)} Welcome Channel\n${getStatus(greeting.goodbyeChannelId)} Goodbye Channel`, inline: true },
      { name: '📜 Logs', value: `${getStatus(settings.logChannelId)} Global Logs\n${getStatus(settings.voiceLogChannelId)} Voice Logs`, inline: true },
      { name: '👑 Authority', value: `${getStatus(settings.ownerRoleId)} Owner Role\n${getStatus(settings.managerRoleId)} Manager Role`, inline: true }
    )
    .setFooter({ text: 'Neural Links are updated instantly upon selection.' });

  return embed;
}

/**
 * Builds the selection rows.
 */
function buildSetupRows() {
  const systemRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_target_select')
      .setPlaceholder('🎯 1. Select Target System...')
      .addOptions([
        { label: 'Classification Channel', value: 'classificationChannelId', description: 'Where recruitment prompts appear.' },
        { label: 'Clan Member Role', value: 'clanMemberRoleId', description: 'Role assigned to new recruits.' },
        { label: 'Discord Member Role', value: 'discordMemberRoleId', description: 'Role for guest members.' },
        { label: 'Welcome Channel', value: 'welcomeChannelId', description: 'Where greeting messages are sent.' },
        { label: 'Goodbye Channel', value: 'goodbyeChannelId', description: 'Where leave messages are sent.' },
        { label: 'Global Log Channel', value: 'logChannelId', description: 'Primary audit logs.' },
        { label: 'Voice Log Channel', value: 'voiceLogChannelId', description: 'Logs for voice activity.' },
        { label: 'Manager Role', value: 'managerRoleId', description: 'Staff who can classify members.' },
        { label: 'Owner Role', value: 'ownerRoleId', description: 'Primary server owner role.' }
      ])
  );

  return [systemRow];
}

module.exports = {
  buildSetupEmbed,
  buildSetupRows
};
