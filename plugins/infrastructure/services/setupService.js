const { 
  ActionRowBuilder, 
  ChannelSelectMenuBuilder, 
  RoleSelectMenuBuilder, 
  ChannelType, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

/**
 * Builds the Infrastructure Health Report with Components v2.
 */
async function buildSetupContainer(guild) {
  const config = await GuildConfig.findOne({ guildId: guild.id });
  const settings = config?.settings || {};
  const greeting = config?.greetingData || {};

  const getStatus = (val) => (val && val !== 'null' && val !== 'undefined') ? '`🟢 Connected` ' : '`🔴 Disconnected`';

  const container = new ContainerBuilder();

  // 1. Header & Image
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('🛰️ **Neural Bridge — Advanced System Setup**')
  );
  
  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('https://cdn.discordapp.com/attachments/1353964404378701916/1410195184943452170/neural_bridge_header.png')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // 2. Identity & Security
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `🛡️ **Identity & Security**\n` +
      `**Classification:** ${getStatus(settings.classificationChannelId)}\n` +
      `**Clan Role:** ${getStatus(settings.clanMemberRoleId)}\n` +
      `**Owner Role:** ${getStatus(settings.ownerRoleId)}\n` +
      `**Manager Role:** ${getStatus(settings.managerRoleId)}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // 3. Social & Voice
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `💬 **Social Matrix & Voice**\n` +
      `**Welcome:** ${getStatus(greeting.welcomeChannelId)} | **Goodbye:** ${getStatus(greeting.goodbyeChannelId)}\n` +
      `**VC Create:** ${getStatus(settings.tempvcCreateChannelId)} | **VC Category:** ${getStatus(settings.tempvcCategoryId)}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // 4. Infrastructure Logs
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `📡 **Infrastructure Logs**\n` +
      `**Global:** ${getStatus(settings.logChannelId)} | **Voice:** ${getStatus(settings.voiceLogChannelId)}\n` +
      `**Message:** ${getStatus(settings.messageLogChannelId)} | **Server:** ${getStatus(settings.serverLogChannelId)}\n` +
      `**Invite:** ${getStatus(settings.inviteLogChannelId)} | **Member:** ${getStatus(settings.memberLogChannelId)}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // 5. specialized Status
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `⚙️ *Neural Links are updated instantly upon selection below.*`
    )
  );

  return container;
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
  buildSetupContainer,
  buildSetupRows
};
