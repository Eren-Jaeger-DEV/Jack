/**
 * guildMemberAdd.js — New Member Classification Prompt
 *
 * When a new member joins, sends a message with two buttons
 * in the classification channel for admins to classify them.
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const classificationService = require('../services/classificationService');
const configManager = require('../../../bot/utils/configManager');


module.exports = {
  name: 'guildMemberAdd',

  async execute(member, client) {
    if (!member.guild) return;
    if (member.user.bot) return;

    try {
      const config = await configManager.getGuildConfig(member.guild.id);
      const classificationChannelId = config?.settings?.classificationChannelId;

      if (!classificationChannelId) return;

      const channel = await client.channels.fetch(classificationChannelId).catch(() => null);
      if (!channel) {
        console.error('[MemberClassification] Classification channel not found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('👤 New Member Joined')
        .setDescription(
          `A new member has joined: <@${member.id}>\n\n` +
          `Is this user joining the clan or just a Discord member?`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setColor('#5865F2')
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`classify_clan_${member.id}`)
          .setLabel('Join Clan')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⚔️'),
        new ButtonBuilder()
          .setCustomId(`classify_discord_${member.id}`)
          .setLabel('Discord Member')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👋')
      );

      const message = await channel.send({ embeds: [embed], components: [row] });

      // Track for reminders
      await classificationService.addAwaitingClassification(member.guild.id, member.id, message.id);

      console.log(`[MemberClassification] Classification prompt sent for ${member.user.tag}`);

    } catch (err) {
      console.error('[MemberClassification] guildMemberAdd error:', err);
    }
  }
};
