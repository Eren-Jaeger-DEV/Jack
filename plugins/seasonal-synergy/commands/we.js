/**
 * we.js — Submit Weekly Energy (member + admin override)
 *
 * Hybrid: /we <points> or j we <points>
 * Admin:  /we @user <points> or j we @user <points>
 *
 * Validation:
 *  - Weekend only (Sat/Sun) for members
 *  - One submission per day per user
 *  - Points between 1 and 1000
 *  - Must be registered + have clan role
 *  - Active season required
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Player = require('../../../bot/database/models/Player');
const synergyService = require('../services/synergyService');

module.exports = {
  name: 'we',
  category: 'seasonal-synergy',
  description: 'Submit your weekly energy points',
  aliases: ['weeklyenergy'],
  usage: '/we <points>  |  j we <points>  |  /we @user <points> (admin)',
  details: `Submit weekly energy (1-${synergyService.MAX_WEEKLY_ENERGY}). Weekend only. Admins can submit on behalf of a user and bypass restrictions.`,

  data: new SlashCommandBuilder()
    .setName('we')
    .setDescription('Submit weekly energy points')
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('Your energy points')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(synergyService.MAX_WEEKLY_ENERGY)
    )
    .addUserOption(o =>
      o.setName('user')
        .setDescription('(Admin) Target user to submit energy for')
        .setRequired(false)
    ),

  async run(ctx) {
    try {
      const isEphemeral = ctx.isInteraction;
      const isAdmin = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild);

      // Parse points
      let points;
      if (ctx.isInteraction) {
        points = ctx.options.getInteger('points');
      } else {
        // Prefix: j we <points> OR j we @user <points>
        const args = ctx.args || [];
        // Check if first arg is a mention
        const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          points = parseInt(args[1]);
        } else {
          points = parseInt(args[0]);
        }
      }

      if (isNaN(points) || points <= 0 || points > synergyService.MAX_WEEKLY_ENERGY) {
        return ctx.reply({ content: `❌ Points must be a number between 1 and ${synergyService.MAX_WEEKLY_ENERGY}.`, ephemeral: isEphemeral });
      }

      // Determine target user (admin mode or self)
      let targetUser;
      if (ctx.isInteraction) {
        targetUser = ctx.options.getUser('user');
      } else {
        const args = ctx.args || [];
        const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          targetUser = await ctx.client.users.fetch(mentionMatch[1]).catch(() => null);
        }
      }

      // If targeting another user, must be admin
      if (targetUser && !isAdmin) {
        return ctx.reply({ content: '❌ Only admins can submit energy on behalf of other users.', ephemeral: isEphemeral });
      }

      const userId = targetUser ? targetUser.id : ctx.user.id;
      const adminBypass = targetUser ? true : isAdmin && targetUser !== undefined;

      // Clan role check (for self-submissions only)
      if (!targetUser) {
        if (!ctx.member.roles.cache.has(synergyService.CLAN_ROLE_ID)) {
          return ctx.reply({ content: '❌ You must be a clan member to participate.', ephemeral: isEphemeral });
        }
      }

      // Registration check
      const player = await Player.findOne({ discordId: userId });
      if (!player || !player.ign) {
        return ctx.reply({ content: '❌ You must register first using `/register` in <#1479697157840830524>.', ephemeral: isEphemeral });
      }

      // Active season check
      const season = await synergyService.getActiveSeason(ctx.guild.id);
      if (!season) {
        return ctx.reply({ content: '❌ No active season is currently running.', ephemeral: isEphemeral });
      }

      // Add weekly energy
      const result = await synergyService.addWeeklyEnergy(userId, points, !!targetUser);

      if (!result.success) {
        return ctx.reply({ content: `❌ ${result.error}`, ephemeral: isEphemeral });
      }

      const displayName = player.ign || userId;
      console.log(`[SeasonalSynergy] ${targetUser ? `Admin ${ctx.user.tag} submitted` : `${ctx.user.tag} submitted`} ${points} weekly energy for ${displayName}`);

      await ctx.reply({ content: `✅ **${points}** weekly energy recorded for **${displayName}**!`, ephemeral: isEphemeral });

      // Refresh leaderboard in SYNERGY channel
      const freshSeason = await synergyService.getActiveSeason(ctx.guild.id);
      if (freshSeason) {
        await synergyService.refreshLeaderboard(ctx.client, freshSeason);
      }

    } catch (err) {
      console.error('[SeasonalSynergy] we command error:', err);
      await ctx.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
};
