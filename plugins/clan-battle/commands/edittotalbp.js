/**
 * edittotalbp.js — Admin command to edit a player's TOTAL points
 *
 * Hybrid: /edittotalbp @user <points>  |  j edittotalbp @user <points>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const battleService = require('../services/battleService');

const CLAN_BATTLE_CHANNEL_ID = '1379098755592093787';

module.exports = {

  name: 'edittotalbp',
  category: 'clan-battle',
  description: "Edit a player's total battle points",
  aliases: ['edittotalbattlepoint'],
  usage: '/edittotalbp @user <points>  |  j edittotalbp @user <points>',
  details: "Admin command to directly set a player's total contribution points.",

  data: new SlashCommandBuilder()
    .setName('edittotalbp')
    .setDescription("Edit a player's total battle points")
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Player to edit')
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('New total points value')
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
        return ctx.reply('Usage: `j edittotalbp @user <points>`');
      }

      // Edit
      const result = await battleService.editTotalPoints(ctx.guild.id, user.id, points);

      if (!result.success) {
        return ctx.reply(`❌ ${result.error}`);
      }

      console.log(`[ClanBattle] Admin ${ctx.user.tag} set total points for ${user.tag} to ${points}`);

      await ctx.reply(`✅ Set **${user.tag}**'s total points to **${points}**`);

      // Refresh leaderboard
      const battle = await battleService.getActiveBattle(ctx.guild.id);
      if (battle && ctx.channel.id === CLAN_BATTLE_CHANNEL_ID) {
        await battleService.refreshLeaderboard(ctx.channel, battle);
      }

    } catch (err) {
      console.error('[ClanBattle] edittotalbp error:', err);
      await ctx.reply('❌ Something went wrong.').catch(() => {});
    }
  }

};
