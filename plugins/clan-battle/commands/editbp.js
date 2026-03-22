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
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('New today points value')
        .setRequired(true))
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Discord user to edit (provide either user or uid)')
        .setRequired(false))
    .addStringOption(o =>
      o.setName('uid')
        .setDescription('Target player by UID (if not on Discord)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {
    try {
      if (ctx.isInteraction) await ctx.deferReply().catch(() => {});

      // Permission check
      const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

      const replyFn = (content) => ctx.isInteraction ? ctx.editReply({ content }) : ctx.reply(content);

      if (!hasPerm) {
        return replyFn('❌ Only Moderators or Admins can use this command.');
      }

      // Parse args
      let userArg, uidArg, points;

      if (ctx.isInteraction) {
        userArg = ctx.options.getUser('user');
        uidArg = ctx.options.getString('uid');
        points = ctx.options.getInteger('points');
      } else {
        const args = ctx.args || [];
        if (args.length >= 2) {
          const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
          if (mentionMatch) {
            userArg = await ctx.client.users.fetch(mentionMatch[1]).catch(() => null);
          } else {
            uidArg = args[0];
          }
          points = parseInt(args[1]);
        }
      }

      if ((!userArg && !uidArg) || isNaN(points)) {
        return replyFn('Usage: `/editbp <points> [user] [uid]` or `j editbp @user <points>` or `j editbp uid:<number> <points>`');
      }

      // Edit
      const result = await battleService.editTodayPoints(ctx.guild.id, { user: userArg, uid: uidArg }, points);

      if (!result.success) {
        return replyFn(`❌ ${result.error}`);
      }

      const targetLabel = userArg ? userArg.tag : (result.player ? result.player.ign : uidArg);
      console.log(`[ClanBattle] Admin ${ctx.user.tag} edited today points for ${targetLabel} to ${points}`);

      await replyFn(`✅ Updated **${targetLabel}**'s today points to **${points}** (total: **${result.player.totalPoints}**)`);

      // Refresh leaderboard
      const battle = await battleService.getActiveBattle(ctx.guild.id);
      if (battle && ctx.channel.id === CLAN_BATTLE_CHANNEL_ID) {
        await battleService.refreshLeaderboard(ctx.client, battle);
      }

    } catch (err) {
      console.error('[ClanBattle] editbp error:', err);
      if (ctx.isInteraction) {
        await ctx.editReply('❌ Something went wrong.').catch(() => {});
      } else {
        await ctx.reply('❌ Something went wrong.').catch(() => {});
      }
    }
  }
};
