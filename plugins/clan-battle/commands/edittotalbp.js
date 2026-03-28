/**
 * edittotalbp.js — Admin command to edit a player's TOTAL points
 *
 * Hybrid: /edittotalbp @user <points>  |  j edittotalbp @user <points>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const battleService = require('../services/battleService');
const configManager = require('../../../bot/utils/configManager');

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
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('New total points value')
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
      if (ctx.isInteraction) await ctx.defer().catch(() => {});

      // Permission check
      const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!hasPerm) {
        return ctx.reply('❌ Only Moderators or Admins can use this command.');
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
        return ctx.reply('Usage: `j edittotalbp @user <points>` or `j edittotalbp uid:<number> <points>`');
      }

      // Edit
      const result = await battleService.editTotalPoints(ctx.guild.id, { user: userArg, uid: uidArg }, points);

      if (!result.success) {
        return ctx.reply(`❌ ${result.error}`);
      }

      const targetLabel = userArg ? userArg.tag : (result.player ? result.player.ign : uidArg);
      console.log(`[ClanBattle] Admin ${ctx.user.tag} set total points for ${targetLabel} to ${points}`);

      await ctx.reply(`✅ Set **${targetLabel}**'s total points to **${points}**`);

      // Refresh leaderboard
      const config = await configManager.getGuildConfig(ctx.guild.id);
      const clanBattleChannelId = config?.settings?.clanBattleChannelId;
      const battle = await battleService.getActiveBattle(ctx.guild.id);
      if (battle && clanBattleChannelId && ctx.channel.id === clanBattleChannelId) {
        await battleService.refreshLeaderboard(ctx.client, battle);
      }

    } catch (err) {
      console.error('[ClanBattle] edittotalbp error:', err);
      await ctx.reply('❌ Something went wrong.').catch(() => {});
    }
  }
};
