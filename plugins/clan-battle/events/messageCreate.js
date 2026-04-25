const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const battleService = require('../services/battleService');
const profileService = require('../../clan/services/profileService');
const configManager = require('../../../bot/utils/configManager');
const logger = require('../../../utils/logger');

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
    
    // HARDCODE/FIX: Support the mapped trigger channel
    const fallbackChannelId = client.serverMap?.getChannel('clan_activity', 'clan_battle')?.id || '1379098755592093787';
    const isTriggerChannel = (clanBattleChannelId && message.channel.id === clanBattleChannelId) || message.channel.id === fallbackChannelId;
    
    const content = message.content.toLowerCase().trim();
    const isUserAdmin = message.member && message.member.permissions.has(PermissionFlagsBits.ManageGuild);

    // Read-only logic: Delete non-admin messages in the battle channel
    if (isTriggerChannel && !isUserAdmin) {
      try {
        await message.delete().catch(() => {});
      } catch (err) {
        // Silently fail if cannot delete
      }
      return;
    }

    if (!isTriggerChannel) return;
    if (!isUserAdmin) return;

    /* ═══════════════════════════════════════════
     *  TRIGGER 1 — Battle Start (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'clan battle started') {
      try {
        // Prevent multiple active battles
        const existing = await battleService.getActiveBattle(message.guild.id);
        if (existing) {
          logger.warn("ClanBattle", `Admin ${message.author.tag} tried to start a battle, but one is already active.`);
          return message.reply('⚠️ A clan battle is already active. End it before starting a new one.');
        }

        // Create new battle
        const battle = await battleService.createBattle(message.guild.id, message.channel.id);

        logger.info("ClanBattle", `⚔️ Battle started in guild ${message.guild.id} by ${message.author.tag}`);

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

        logger.info("ClanBattle", `Battle ended in guild ${message.guild.id}`);

        // Delete old leaderboard
        await battleService.deleteOldLeaderboardMessage(client, finalBattle);

        const guild = await client.guilds.fetch(finalBattle.guildId).catch(() => null);

        // EXTRA: Full Archive Generation
        const archiveMsg = await message.channel.send('⏳ **Archiving final clan battle leaderboard...**');
        try {
          const attachments = await battleService.getAllLeaderboardImages(client, finalBattle);
          if (attachments.length > 0) {
            // Send in batches of 10
            for (let i = 0; i < attachments.length; i += 10) {
              const batch = attachments.slice(i, i + 10);
              const startPage = i + 1;
              const endIdx = Math.min(i + batch.length, attachments.length);
              await message.channel.send({
                content: `🖼️ **Clan Battle Archive: Pages ${startPage} - ${endIdx}**`,
                files: batch
              });
            }
          }
          await archiveMsg.delete().catch(() => {});
        } catch (err) {
          logger.error("ClanBattle", `Archive error: ${err.message}`);
          await archiveMsg.edit('⚠️ Failed to generate full archive, proceeding with winner announcement.').catch(() => {});
        }

        // Build final results
        const { container, top6 } = await battleService.buildFinalResults(guild, finalBattle);

        // Send results
        await message.channel.send({ 
            content: "",
            embeds: [],
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        // Role assignment: remove WINNER_ROLE from all, then assign to top 6
        const winnerRole = clanBattleWinnerRoleId ? message.guild.roles.cache.get(clanBattleWinnerRoleId) : null;
        if (winnerRole) {
          // Remove from all
          for (const [, member] of winnerRole.members) {
            await member.roles.remove(winnerRole).catch(err => {
              logger.error("ClanBattle", `Failed to remove winner role from ${member.user.tag}: ${err.message}`);
            });
          }

          // Assign to top 6
          for (const p of top6) {
            try {
              const member = await message.guild.members.fetch(p.userId).catch(() => null);
              if (member) await member.roles.add(winnerRole);
            } catch (err) {
              logger.error("ClanBattle", `Failed to assign winner role to ${p.userId}: ${err.message}`);
            }
          }
        }

        await message.react('🏆');

        // Achievement tracking: update bestClanBattleRank for ALL participants, increment wins for #1
        const sortedPlayers = [...finalBattle.players].sort((a, b) => b.totalPoints - a.totalPoints);
        for (let i = 0; i < sortedPlayers.length; i++) {
          const rank = i + 1;
          const p = sortedPlayers[i];
          
          if (rank === 1) {
            await profileService.incrementAchievement(p.userId, 'achievements.clanBattleWins');
          }
          await profileService.setAchievementIfBetter(p.userId, 'achievements.bestClanBattleRank', rank);
        }

      } catch (err) {
        console.error('[ClanBattle] End error:', err);
        await message.reply('❌ Failed to end the clan battle.').catch(() => {});
      }
      return;
    }
  }
};
