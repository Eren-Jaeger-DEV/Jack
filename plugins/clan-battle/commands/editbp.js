/**
 * editbp.js — Admin command to edit a player's TODAY points
 *
 * Hybrid: /editbp @user <points>  |  j editbp @user <points>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const battleService = require('../services/battleService');

const CLAN_BATTLE_CHANNEL_ID = '1379098755592093787';

module.exports = {

  name: 'editbp',
  category: 'clan-battle',
  description: "Edit a player's today battle points",
  aliases: ['editbattlepoint'],
  usage: '/editbp @user <points>  |  j editbp @user <points>',
  details: "Admin command to overwrite a player's daily contribution points. Adjusts total accordingly.",

  data: new SlashCommandBuilder()
    .setName('editbp')
    .setDescription("Edit a player's today battle points")
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Player to edit')
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('New today points value')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {
    try {
      // Permission check
      const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!hasPerm) {
        return ctx.reply('❌ Only Moderators or Admins can use this command.');
      }

      // Parse args
      let user, points;

      if (ctx.isInteraction) {
        user = ctx.options.getUser('user');
        points = ctx.options.getInteger('points');
      } else {
        user = ctx.message?.mentions?.users?.first();
        points = parseInt(ctx.args?.[1]);
      }

      if (!user || isNaN(points)) {
        return ctx.reply('Usage: `j editbp @user <points>`');
      }

      // Edit
      const result = await battleService.editTodayPoints(ctx.guild.id, user.id, points);

      if (!result.success) {
        return ctx.reply(`❌ ${result.error}`);
      }

      console.log(`[ClanBattle] Admin ${ctx.user.tag} edited today points for ${user.tag} to ${points}`);

      await ctx.reply(`✅ Updated **${user.tag}**'s today points to **${points}** (total: **${result.player.totalPoints}**)`);

      // Refresh leaderboard
      const battle = await battleService.getActiveBattle(ctx.guild.id);
      if (battle && ctx.channel.id === CLAN_BATTLE_CHANNEL_ID) {
        await battleService.refreshLeaderboard(ctx.client, battle);
      }

    } catch (err) {
      console.error('[ClanBattle] editbp error:', err);
      await ctx.reply('❌ Something went wrong.').catch(() => {});
    }
  }

};
