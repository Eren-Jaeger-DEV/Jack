/**
 * se.js — Set Season Energy (Admin Only)
 *
 * Hybrid: /se @user <points> or j se @user <points>
 *
 * Directly sets the season energy for a target user.
 * Requires ManageGuild permission.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Player = require('../../../bot/database/models/Player');
const synergyService = require('../services/synergyService');
const { resolveDisplayName } = require('../../../bot/utils/nameResolver');

module.exports = {
  name: 'se',
  category: 'seasonal-synergy',
  description: 'Set season energy for a user (Admin)',
  aliases: ['seasonenergy'],
  usage: '/se @user <points>  |  j se @user <points>',
  details: 'Admin command to directly set a user\'s season energy.',

  data: new SlashCommandBuilder()
    .setName('se')
    .setDescription('Set season energy for a user (Admin)')
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('Season energy points to set')
        .setRequired(true)
        .setMinValue(0)
    )
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Discord target user (provide either user or uid)')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('uid')
        .setDescription('Target player by UID (if not on Discord)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    try {
      const isEphemeral = ctx.isInteraction;
      
      // Acknowledge interaction to prevent 3-second timeout
      if (ctx.isInteraction) await ctx.deferReply({ ephemeral: isEphemeral }).catch(() => {});

      // Admin check
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return ctx.isInteraction ? ctx.editReply({ content: '❌ You need **Manage Server** permission to use this command.' }) : ctx.reply('❌ You need **Manage Server** permission to use this command.');
      }

      // Parse target user and points
      let targetUser, targetUid, points;

      if (ctx.isInteraction) {
        targetUser = ctx.options.getUser('user');
        targetUid = ctx.options.getString('uid');
        points = ctx.options.getInteger('points');
      } else {
        const args = ctx.args || [];
        if (args.length >= 2) {
          const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
          if (mentionMatch) {
            targetUser = await ctx.client.users.fetch(mentionMatch[1]).catch(() => null);
          } else {
            targetUid = args[0];
          }
          points = parseInt(args[1]);
        }
      }

      if ((!targetUser && !targetUid) || isNaN(points)) {
        return ctx.isInteraction ? ctx.editReply({ content: 'Usage: `/se <points> [user] [uid]` or `j se @user <points>` or `j se uid:<number> <points>`' }) : ctx.reply('Usage: `j se @user <points>` or `j se uid:<number> <points>`');
      }

      if (points < 0) {
        return ctx.isInteraction ? ctx.editReply({ content: '❌ Points must be a valid non-negative number.' }) : ctx.reply('❌ Points must be a valid non-negative number.');
      }

      // Active season check
      const season = await synergyService.getActiveSeason(ctx.guild.id);
      if (!season) {
        return ctx.isInteraction ? ctx.editReply({ content: '❌ No active season is currently running.' }) : ctx.reply('❌ No active season is currently running.');
      }

      // Set season energy
      const result = await synergyService.setSeasonEnergy({ user: targetUser, uid: targetUid }, points);

      if (!result.success) {
        return ctx.isInteraction ? ctx.editReply({ content: `❌ ${result.error}` }) : ctx.reply(`❌ ${result.error}`);
      }

      const dbPlayer = result.player;
      const name = await resolveDisplayName(ctx.guild, dbPlayer.discordId, dbPlayer.ign);
      const displayName = name;
      console.log(`[SeasonalSynergy] Admin ${ctx.user.tag} set season energy for ${displayName} to ${points}`);

      if (ctx.isInteraction) {
        await ctx.editReply({ content: `✅ Season energy for **${displayName}** set to **${points}**.` });
      } else {
        await ctx.reply(`✅ Season energy for **${displayName}** set to **${points}**.`);
      }

      // Refresh leaderboard
      const freshSeason = await synergyService.getActiveSeason(ctx.guild.id);
      if (freshSeason) {
        await synergyService.refreshLeaderboard(ctx.client, freshSeason);
      }

    } catch (err) {
      console.error('[SeasonalSynergy] se command error:', err);
      if (ctx.isInteraction) {
        await ctx.editReply({ content: '❌ Something went wrong.' }).catch(() => {});
      } else {
        await ctx.reply('❌ Something went wrong.').catch(() => {});
      }
    }
  }
};
