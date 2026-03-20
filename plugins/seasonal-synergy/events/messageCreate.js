/**
 * messageCreate.js — Seasonal Synergy Event Handler
 *
 * Detects two strict triggers in SYNERGY_CHANNEL_ID:
 *  1. "new season started" — Start a new season
 *  2. "season ends"        — End the active season, assign winner roles
 *
 * Also enforces read-only on the synergy channel for non-admins.
 */

const { PermissionFlagsBits } = require('discord.js');
const synergyService = require('../services/synergyService');
const profileService = require('../../clan/services/profileService');

const SYNERGY_CHANNEL_ID    = synergyService.SYNERGY_CHANNEL_ID;
const SEASON_WINNER_ROLE_ID = synergyService.SEASON_WINNER_ROLE_ID;
const WEEKLY_MVP_ROLE_ID    = synergyService.WEEKLY_MVP_ROLE_ID;

/* ── PATCH 3: Duplicate event protection ── */
const processedEvents = new Set();
function isDuplicate(eventId) {
  if (processedEvents.has(eventId)) return true;
  processedEvents.add(eventId);
  setTimeout(() => processedEvents.delete(eventId), 600000);
  return false;
}

module.exports = {
  name: 'messageCreate',

  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (isDuplicate(message.id)) return;

    const content = message.content.toLowerCase().trim();
    const isUserAdmin = message.member && message.member.permissions.has(PermissionFlagsBits.ManageGuild);

    // Read-only logic: delete non-admin messages in the synergy channel
    if (message.channel.id === SYNERGY_CHANNEL_ID && !isUserAdmin) {
      try {
        await message.delete().catch(() => {});
      } catch (err) {
        // Silently fail
      }
      return;
    }

    if (message.channel.id !== SYNERGY_CHANNEL_ID) return;
    if (!isUserAdmin) return;

    /* ═══════════════════════════════════════════
     *  TRIGGER 1 — New Season Started (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'new season started') {
      try {
        // Prevent duplicate active seasons
        const existing = await synergyService.getActiveSeason(message.guild.id);
        if (existing) {
          console.warn(`[SeasonalSynergy] Admin ${message.author.tag} tried to start a season, but one is already active.`);
          return message.reply('⚠️ A season is already active. End it before starting a new one.');
        }

        // Create new season
        const season = await synergyService.createSeason(message.guild.id, message.channel.id);

        console.log(`[SeasonalSynergy] ⚡ New season started in guild ${message.guild.id} by ${message.author.tag}`);

        // Send registration reminder
        await message.channel.send(
          '📢 **New Season has started!**\n\n' +
          'Please register yourself using `/register` in <#1479697157840830524>\n' +
          'You must be a clan member to participate.\n' +
          'Otherwise your stats will not appear.'
        );

        // Send initial leaderboard
        await synergyService.refreshLeaderboard(client, season);

        await message.react('⚡');

      } catch (err) {
        console.error('[SeasonalSynergy] Start error:', err);
        await message.reply('❌ Failed to start the season.').catch(() => {});
      }
      return;
    }

    /* ═══════════════════════════════════════════
     *  TRIGGER 2 — Season Ends (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'season ends') {
      try {
        const season = await synergyService.getActiveSeason(message.guild.id);
        if (!season) {
          return message.reply('⚠️ No active season to end.');
        }

        // End the season
        const finalSeason = await synergyService.endSeason(message.guild.id);

        console.log(`[SeasonalSynergy] Season ended in guild ${message.guild.id}`);

        // Delete old leaderboard
        await synergyService.deleteOldLeaderboardMessage(client, finalSeason);

        // Build final results
        const guild = await client.guilds.fetch(finalSeason.guildId).catch(() => null);
        const { results, top3 } = await synergyService.buildFinalResults(guild);

        // Send results
        await message.channel.send(results);
        await message.channel.send('🎉 **Season winners, create a ticket to claim your rewards!**');

        // Role assignment — Season Winner (PATCH 5: fetch all members first)
        const winnerRole = message.guild.roles.cache.get(SEASON_WINNER_ROLE_ID);
        if (winnerRole) {
          await message.guild.members.fetch().catch(() => {});

          // Remove from ALL current holders
          for (const [, member] of winnerRole.members) {
            await member.roles.remove(winnerRole).catch(err => {
              console.error(`[SeasonalSynergy] Failed to remove season winner role from ${member.user.tag}:`, err.message);
            });
          }
          // Assign to top 3
          for (const p of top3) {
            try {
              const member = await message.guild.members.fetch(p.discordId).catch(() => null);
              if (member) await member.roles.add(winnerRole);
            } catch (err) {
              console.error(`[SeasonalSynergy] Failed to assign season winner role to ${p.discordId}:`, err.message);
            }
          }
        }

        // Remove all weekly MVP roles (PATCH 5: fetch first)
        const mvpRole = message.guild.roles.cache.get(WEEKLY_MVP_ROLE_ID);
        if (mvpRole) {
          await message.guild.members.fetch().catch(() => {});
          for (const [, member] of mvpRole.members) {
            await member.roles.remove(mvpRole).catch(() => {});
          }
        }

        // Reset all energy
        await synergyService.resetAllEnergy();

        await message.react('🏆');

        // Achievement: update highestSeasonRank for top 3
        for (let i = 0; i < top3.length; i++) {
          const rank = i + 1;
          await profileService.setAchievementIfBetter(top3[i].discordId, 'achievements.highestSeasonRank', rank);
        }

      } catch (err) {
        console.error('[SeasonalSynergy] End error:', err);
        await message.reply('❌ Failed to end the season.').catch(() => {});
      }
      return;
    }
  }
};
