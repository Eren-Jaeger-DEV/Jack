/**
 * guildMemberAdd.js — New Member Classification Prompt
 *
 * When a new member joins, sends a message with two buttons
 * in the classification channel for admins to classify them.
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const classificationService = require('../services/classificationService');

const CLASSIFICATION_CHANNEL_ID = classificationService.CLASSIFICATION_CHANNEL_ID;

module.exports = {
  name: 'guildMemberAdd',

  async execute(member, client) {
    if (!member.guild) return;
    if (member.user.bot) return;

    try {
      const channel = await client.channels.fetch(CLASSIFICATION_CHANNEL_ID).catch(() => null);
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

      await channel.send({ embeds: [embed], components: [row] });

      console.log(`[MemberClassification] Classification prompt sent for ${member.user.tag}`);

    } catch (err) {
      console.error('[MemberClassification] guildMemberAdd error:', err);
    }
  }
};
