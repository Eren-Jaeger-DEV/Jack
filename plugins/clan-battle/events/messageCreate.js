/**
 * messageCreate.js — Clan Battle Event Handler
 *
 * Detects two triggers in the battle channel:
 *  1. "clan battle started" — Start a new battle
 *  2. "clan battle ends"    — End the active battle, announce winners
 *
 * Also handles leaderboard pagination button interactions.
 */

const { PermissionFlagsBits } = require('discord.js');
const battleService = require('../services/battleService');
const profileService = require('../../clan/services/profileService');
const configManager = require('../../../bot/utils/configManager');

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
    const config = await configManager.getGuildConfig(message.guild.id);
    const clanBattleChannelId = config?.settings?.clanBattleChannelId;
    const clanBattleWinnerRoleId = config?.settings?.clanBattleWinnerRoleId;
    const content = message.content.toLowerCase().trim();
    const isUserAdmin = message.member && message.member.permissions.has(PermissionFlagsBits.ManageGuild);

    // Read-only logic: Delete non-admin messages in the battle channel
    if (clanBattleChannelId && message.channel.id === clanBattleChannelId && !isUserAdmin) {
      try {
        await message.delete().catch(() => {});
      } catch (err) {
        // Silently fail if cannot delete
      }
      return;
    }

    if (!clanBattleChannelId || message.channel.id !== clanBattleChannelId) return;
    if (!isUserAdmin) return;

    /* ═══════════════════════════════════════════
     *  TRIGGER 1 — Battle Start (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'clan battle started') {
      try {
        // Prevent multiple active battles
        const existing = await battleService.getActiveBattle(message.guild.id);
        if (existing) {
          console.warn(`[ClanBattle] Admin ${message.author.tag} tried to start a battle, but one is already active.`);
          return message.reply('⚠️ A clan battle is already active. End it before starting a new one.');
        }

        // Create new battle
        const battle = await battleService.createBattle(message.guild.id, message.channel.id);

        console.log(`[ClanBattle] ⚔️ Battle started in guild ${message.guild.id} by ${message.author.tag}`);

        // Send initial leaderboard
        await battleService.refreshLeaderboard(client, battle);

        await message.react('⚔️');

      } catch (err) {
        console.error('[ClanBattle] Start error:', err);
        await message.reply('❌ Failed to start the clan battle.').catch(() => {});
      }
      return;
    }

    /* ═══════════════════════════════════════════
     *  TRIGGER 2 — Battle End (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'clan battle ends') {
      try {
        const battle = await battleService.getActiveBattle(message.guild.id);
        if (!battle) {
          return message.reply('⚠️ No active clan battle to end.');
        }

        // End the battle
        const finalBattle = await battleService.endBattle(message.guild.id);

        console.log(`[ClanBattle] Battle ended in guild ${message.guild.id}`);

        // Delete old leaderboard
        await battleService.deleteOldLeaderboardMessage(client, finalBattle);

        // Build final results
        const guild = await client.guilds.fetch(finalBattle.guildId).catch(() => null);
        const { results, top6 } = await battleService.buildFinalResults(guild, finalBattle);

        // Send results
        await message.channel.send(results);
        await message.channel.send('🎉 **Winners, create a ticket to claim your rewards.**');

        // Role assignment: remove WINNER_ROLE from all, then assign to top 6
        const winnerRole = clanBattleWinnerRoleId ? message.guild.roles.cache.get(clanBattleWinnerRoleId) : null;
        if (winnerRole) {
          // Remove from all
          for (const [, member] of winnerRole.members) {
            await member.roles.remove(winnerRole).catch(err => {
              console.error(`[ClanBattle] Failed to remove winner role from ${member.user.tag}:`, err.message);
            });
          }

          // Assign to top 6
          for (const p of top6) {
            try {
              const member = await message.guild.members.fetch(p.userId).catch(() => null);
              if (member) await member.roles.add(winnerRole);
            } catch (err) {
              console.error(`[ClanBattle] Failed to assign winner role to ${p.userId}:`, err.message);
            }
          }
        }

        await message.react('🏆');

        // Achievement tracking: increment clanBattleWins + update bestClanBattleRank
        for (let i = 0; i < top6.length; i++) {
          const rank = i + 1;
          await profileService.incrementAchievement(top6[i].userId, 'achievements.clanBattleWins');
          await profileService.setAchievementIfBetter(top6[i].userId, 'achievements.bestClanBattleRank', rank);
        }

      } catch (err) {
        console.error('[ClanBattle] End error:', err);
        await message.reply('❌ Failed to end the clan battle.').catch(() => {});
      }
      return;
    }
  }
};
