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
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Target user')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('Season energy points to set')
        .setRequired(true)
        .setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    try {
      const isEphemeral = ctx.isInteraction;

      // Admin check
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return ctx.reply({ content: '❌ You need **Manage Server** permission to use this command.', ephemeral: isEphemeral });
      }

      // Parse target user and points
      let targetUser, points;

      if (ctx.isInteraction) {
        targetUser = ctx.options.getUser('user');
        points = ctx.options.getInteger('points');
      } else {
        const args = ctx.args || [];
        const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
        if (!mentionMatch) {
          return ctx.reply({ content: 'Usage: `j se @user <points>`', ephemeral: isEphemeral });
        }
        targetUser = await ctx.client.users.fetch(mentionMatch[1]).catch(() => null);
        points = parseInt(args[1]);
      }

      if (!targetUser) {
        return ctx.reply({ content: '❌ You must mention a valid user.', ephemeral: isEphemeral });
      }

      if (isNaN(points) || points < 0) {
        return ctx.reply({ content: '❌ Points must be a valid non-negative number.', ephemeral: isEphemeral });
      }

      // Registration check
      const player = await Player.findOne({ discordId: targetUser.id });
      if (!player) {
        return ctx.reply({ content: `❌ <@${targetUser.id}> is not registered.`, ephemeral: isEphemeral });
      }

      // Active season check
      const season = await synergyService.getActiveSeason(ctx.guild.id);
      if (!season) {
        return ctx.reply({ content: '❌ No active season is currently running.', ephemeral: isEphemeral });
      }

      // Set season energy
      const result = await synergyService.setSeasonEnergy(targetUser.id, points);

      if (!result.success) {
        return ctx.reply({ content: `❌ ${result.error}`, ephemeral: isEphemeral });
      }

      const displayName = player.ign || targetUser.tag;
      console.log(`[SeasonalSynergy] Admin ${ctx.user.tag} set season energy for ${displayName} to ${points}`);

      await ctx.reply({ content: `✅ Season energy for **${displayName}** set to **${points}**.`, ephemeral: isEphemeral });

      // Refresh leaderboard
      const freshSeason = await synergyService.getActiveSeason(ctx.guild.id);
      if (freshSeason) {
        await synergyService.refreshLeaderboard(ctx.client, freshSeason);
      }

    } catch (err) {
      console.error('[SeasonalSynergy] se command error:', err);
      await ctx.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
};
