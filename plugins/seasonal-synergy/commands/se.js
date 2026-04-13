/**
 * se.js — Set Season Energy (Admin Only)
 *
 * Hybrid: /se @user <points> or j se @user <points>
 *
 * Directly sets the season energy for a target user.
 * Requires ManageGuild permission.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const perms = require('../../../bot/utils/permissionUtils');
const Player = require('../../../bot/database/models/Player');
const synergyService = require('../services/synergyService');
const { resolveDisplayName } = require('../../../bot/utils/nameResolver');
const { addLog } = require('../../../utils/logger');

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
      if (ctx.isInteraction) await ctx.defer({ ephemeral: isEphemeral }).catch(() => {});

      // Admin check
      if (!perms.isManagement(ctx.member)) {
        return ctx.reply({ content: '❌ You need **Staff Authority** to use this command.', ephemeral: isEphemeral });
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
        return ctx.reply({ content: 'Usage: `j se @user <points>` or `j se uid:<number> <points>`', ephemeral: isEphemeral });
      }

      if (points < 0) {
        return ctx.reply({ content: '❌ Points must be a valid non-negative number.', ephemeral: isEphemeral });
      }

      // Active season check
      const season = await synergyService.getActiveSeason(ctx.guild.id);
      if (!season) {
        return ctx.reply({ content: '❌ No active season is currently running.', ephemeral: isEphemeral });
      }

      // Set season energy
      const result = await synergyService.setSeasonEnergy({ user: targetUser, uid: targetUid }, points);

      if (!result.success) {
        return ctx.reply({ content: `❌ ${result.error}`, ephemeral: isEphemeral });
      }

      const dbPlayer = result.player;
      const name = await resolveDisplayName(ctx.guild, dbPlayer.discordId, dbPlayer.ign);
      const displayName = name;
      addLog("SeasonalSynergy", `Admin ${ctx.user.tag} set season energy for ${displayName} → ${points}`);

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
