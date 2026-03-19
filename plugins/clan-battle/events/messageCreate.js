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

/* ── Constants ── */
const CLAN_BATTLE_CHANNEL_ID = '1379098755592093787';
const WINNER_ROLE_ID         = '1477872032644599892';

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) ||
         member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  name: 'messageCreate',

  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (message.channel.id !== CLAN_BATTLE_CHANNEL_ID) return;
    if (!isAdmin(message.member)) return;

    const content = message.content.toLowerCase().trim();

    /* ═══════════════════════════════════════════
     *  TRIGGER 1 — Battle Start
     * ═══════════════════════════════════════════ */
    if (content.includes('clan battle started')) {
      try {
        // Prevent multiple active battles
        const existing = await battleService.getActiveBattle(message.guild.id);
        if (existing) {
          return message.reply('⚠️ A clan battle is already active. End it before starting a new one.');
        }

        // Create new battle
        const battle = await battleService.createBattle(message.guild.id, message.channel.id);

        console.log(`[ClanBattle] Battle started in guild ${message.guild.id}`);

        // Send initial leaderboard
        await battleService.refreshLeaderboard(message.channel, battle);

        await message.react('⚔️');

      } catch (err) {
        console.error('[ClanBattle] Start error:', err);
        await message.reply('❌ Failed to start the clan battle.').catch(() => {});
      }
      return;
    }

    /* ═══════════════════════════════════════════
     *  TRIGGER 2 — Battle End
     * ═══════════════════════════════════════════ */
    if (content.includes('clan battle ends')) {
      try {
        const battle = await battleService.getActiveBattle(message.guild.id);
        if (!battle) {
          return message.reply('⚠️ No active clan battle to end.');
        }

        // End the battle
        const finalBattle = await battleService.endBattle(message.guild.id);

        console.log(`[ClanBattle] Battle ended in guild ${message.guild.id}`);

        // Delete old leaderboard
        await battleService.deleteOldLeaderboardMessage(message.channel, finalBattle);

        // Get final results (top 6)
        const { results, top6 } = battleService.buildFinalResults(finalBattle);

        // Send results
        await message.channel.send(results);
        await message.channel.send('🎉 **Winners, create a ticket to claim your rewards.**');

        // Role assignment: remove WINNER_ROLE from all, then assign to top 6
        const winnerRole = message.guild.roles.cache.get(WINNER_ROLE_ID);
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

      } catch (err) {
        console.error('[ClanBattle] End error:', err);
        await message.reply('❌ Failed to end the clan battle.').catch(() => {});
      }
      return;
    }
  }
};
