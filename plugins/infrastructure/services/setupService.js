const { EmbedBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

/**
 * Builds the Infrastructure Health Report.
 */
/**
 * Builds the Infrastructure Health Report with a Premium Design.
 */
async function buildSetupEmbed(guild) {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  const settings = config?.settings || {};
  const greeting = config?.greetingData || {};

  const getStatus = (val) => (val && val !== 'null' && val !== 'undefined') ? '`🟢 Connected` ' : '`🔴 Disconnected`';

  const embed = new EmbedBuilder()
    .setTitle('🛰️ Neural Bridge — Advanced System Setup')
    .setColor('#2F3136')
    .setDescription('Configure the biological and synthetic links between Discord and Jack\'s core systems.')
    .addFields(
      { 
        name: '🛡️ Identity & Security', 
        value: `**Classification:** ${getStatus(settings.classificationChannelId)}\n**Clan Role:** ${getStatus(settings.clanMemberRoleId)}\n**Owner Role:** ${getStatus(settings.ownerRoleId)}\n**Manager Role:** ${getStatus(settings.managerRoleId)}`, 
        inline: false 
      },
      { 
        name: '💬 Social Matrix', 
        value: `**Welcome:** ${getStatus(greeting.welcomeChannelId)}\n**Goodbye:** ${getStatus(greeting.goodbyeChannelId)}\n**General:** ${getStatus(settings.generalChannelId)}`, 
        inline: true 
      },
      { 
        name: '📡 Infrastructure Logs', 
        value: `**Global:** ${getStatus(settings.logChannelId)}\n**Voice:** ${getStatus(settings.voiceLogChannelId)}\n**Message:** ${getStatus(settings.messageLogChannelId)}\n**Server:** ${getStatus(settings.serverLogChannelId)}`, 
        inline: true 
      },
      { 
        name: '🎙️ Voice Systems', 
        value: `**Join to Create:** ${getStatus(settings.tempvcCreateChannelId)}\n**VC Category:** ${getStatus(settings.tempvcCategoryId)}\n**VC Panel:** ${getStatus(settings.tempvcPanelChannelId)}`, 
        inline: true 
      },
      { 
        name: '📊 Specialized Logging', 
        value: `**Invite:** ${getStatus(settings.inviteLogChannelId)}\n**Member:** ${getStatus(settings.memberLogChannelId)}\n**Join-Leave:** ${getStatus(settings.joinLeaveLogChannelId)}\n**Tickets:** ${getStatus(settings.ticketsLogChannelId)}\n**Pop-Log:** ${getStatus(settings.popLogChannelId)}`, 
        inline: false 
      }
    )
    .setImage('https://cdn.discordapp.com/attachments/1353964404378701916/1410195184943452170/neural_bridge_header.png')
    .setFooter({ text: 'Neural Links are updated instantly upon selection.', iconURL: guild.iconURL() });

  return embed;
}

/**
 * Builds the selection rows with granular options.
 */
function buildSetupRows() {
  const systemRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_target_select')
      .setPlaceholder('🎯 1. Select Target System...')
      .addOptions([
        { label: 'Classification Channel', value: 'classificationChannelId', emoji: '🛡️' },
        { label: 'Clan Member Role', value: 'clanMemberRoleId', emoji: '⚔️' },
        { label: 'Owner Role', value: 'ownerRoleId', emoji: '👑' },
        { label: 'Manager Role', value: 'managerRoleId', emoji: '⚙️' },
        { label: 'Welcome Channel', value: 'welcomeChannelId', emoji: '👋' },
        { label: 'Goodbye Channel', value: 'goodbyeChannelId', emoji: '🚪' },
        { label: 'Global Log Channel', value: 'logChannelId', emoji: '📜' },
        { label: 'Voice Log Channel', value: 'voiceLogChannelId', emoji: '🔊' },
        { label: 'Message Log Channel', value: 'messageLogChannelId', emoji: '💬' },
        { label: 'Server Log Channel', value: 'serverLogChannelId', emoji: '🌐' },
        { label: 'Invite Log Channel', value: 'inviteLogChannelId', emoji: '📨' },
        { label: 'Member Log Channel', value: 'memberLogChannelId', emoji: '👤' },
        { label: 'Join-Leave Log Channel', value: 'joinLeaveLogChannelId', emoji: '🔄' },
        { label: 'Tickets Log Channel', value: 'ticketsLogChannelId', emoji: '🎫' },
        { label: 'Pop Log Channel', value: 'popLogChannelId', emoji: '💥' },
        { label: 'Join to Create VC', value: 'tempvcCreateChannelId', emoji: '🎙️' },
        { label: 'VC Category', value: 'tempvcCategoryId', emoji: '📂' },
        { label: 'VC Control Panel', value: 'tempvcPanelChannelId', emoji: '🎛️' }
      ])
  );

  return [systemRow];
}

module.exports = {
  buildSetupEmbed,
  buildSetupRows
};
