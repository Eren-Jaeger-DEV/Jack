/**
 * bp.js — Submit daily Battle Points (member command)
 *
 * Hybrid: works via /bp and prefix (j bp <points>)
 *
 * Validation:
 *  - Battle must be active
 *  - Must be in the correct channel
 *  - Must have CLAN_ROLE_ID
 *  - Must exist in Player DB
 *  - Only once per day
 *  - Points between 1 and 100
 */

const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../../bot/database/models/Player');
const battleService = require('../services/battleService');

const CLAN_ROLE_ID           = '1477856665817714699';
const CLAN_BATTLE_CHANNEL_ID = '1379098755592093787';

module.exports = {

  name: 'bp',
  category: 'clan-battle',
  description: 'Submit your daily battle contribution points',
  aliases: ['battlepoint'],
  usage: '/bp <points>  |  j bp <points>',
  details: `Submit your daily battle points (1-${battleService.MAX_POINTS}). Only once per day during an active clan battle.`,

  data: new SlashCommandBuilder()
    .setName('bp')
    .setDescription('Submit your daily battle contribution points')
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('Your contribution points for today')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(battleService.MAX_POINTS)
    ),

  async run(ctx) {
    try {
      // Use ephemeral for slash commands
      const isEphemeral = ctx.isInteraction;

      // Clan role check
      if (!ctx.member.roles.cache.has(CLAN_ROLE_ID)) {
        return ctx.reply({ content: '❌ You must be a clan member to submit battle points.', ephemeral: isEphemeral });
      }

      // Parse points
      let points;

      if (ctx.isInteraction) {
        points = ctx.options.getInteger('points');
      } else {
        points = parseInt(ctx.args?.[0]);
      }

      if (!points || isNaN(points)) {
        return ctx.reply({ content: `Usage: \`j bp <points>\` — Points must be a number between 1 and ${battleService.MAX_POINTS}.`, ephemeral: isEphemeral });
      }

      // Player DB check — must have a registered IGN
      const player = await Player.findOne({ discordId: ctx.user.id });
      if (!player || !player.ign) {
        return ctx.reply({ content: '❌ You are not registered. Use `/register` first.', ephemeral: isEphemeral });
      }

      // Active battle check
      const battle = await battleService.getActiveBattle(ctx.guild.id);
      if (!battle) {
        return ctx.reply({ content: '❌ No clan battle is currently active.', ephemeral: isEphemeral });
      }

      // Add points
      const result = await battleService.addPoints(ctx.guild.id, ctx.user.id, player.ign, points);

      if (!result.success) {
        return ctx.reply({ content: `❌ ${result.error}`, ephemeral: isEphemeral });
      }

      console.log(`[ClanBattle] ${ctx.user.tag} submitted ${points} points`);

      await ctx.reply({ content: `✅ **${points}** battle points recorded for **${player.ign}**!`, ephemeral: isEphemeral });

      // Refresh leaderboard (delete old, send new at bottom)
      const freshBattle = await battleService.getActiveBattle(ctx.guild.id);
      if (freshBattle) {
        await battleService.refreshLeaderboard(ctx.channel, freshBattle);
      }

    } catch (err) {
      console.error('[ClanBattle] bp command error:', err);
      await ctx.reply('❌ Something went wrong.').catch(() => {});
    }
  }

};
