/**
 * messageCreate.js — Foster Program Event Handler
 *
 * Strict triggers in FOSTER_CHANNEL_ID:
 *  1. "foster program started"  — start the program
 *  2. "foster program ends"     — end the program
 *
 * Read-only enforcement for non-admins.
 */

const { PermissionFlagsBits } = require('discord.js');
const fosterService = require('../services/fosterService');
const profileService = require('../../clan/services/profileService');

const FOSTER_CHANNEL_ID = fosterService.FOSTER_CHANNEL_ID;

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

    // Read-only logic for foster channel
    if (message.channel.id === FOSTER_CHANNEL_ID && !isUserAdmin) {
      try { await message.delete().catch(() => {}); } catch {}
      return;
    }

    if (message.channel.id !== FOSTER_CHANNEL_ID) return;
    if (!isUserAdmin) return;

    /* ═══════════════════════════════════════════
     *  TRIGGER — Foster Program Started (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'foster program started') {
      try {
        const existing = await fosterService.getActiveProgram(message.guild.id);
        if (existing) {
          console.warn(`[FosterProgram] Attempted to start while one is active.`);
          return message.reply('⚠️ A foster program is already active. End it first.');
        }

        const result = await fosterService.startProgram(message.guild, client);
        if (!result.success) {
          return message.reply(`❌ ${result.error}`);
        }

        await message.channel.send(
          '🤝 **Foster Program has started!**\n\n' +
          'Mentors and Rookies have been paired.\n' +
          'Use `/fs <points>` with a screenshot to submit synergy points.\n' +
          'Both pair members must submit the same value within 10 minutes.'
        );

        await fosterService.refreshLeaderboard(client, result.program);
        await message.react('🤝');

      } catch (err) {
        console.error('[FosterProgram] Start error:', err);
        await message.reply('❌ Failed to start the foster program.').catch(() => {});
      }
      return;
    }

    /* ═══════════════════════════════════════════
     *  TRIGGER — Foster Program Ends (STRICT)
     * ═══════════════════════════════════════════ */
    if (content === 'foster program ends') {
      try {
        const program = await fosterService.getActiveProgram(message.guild.id);
        if (!program) {
          return message.reply('⚠️ No active foster program to end.');
        }

        // Build final results
        const guild = await client.guilds.fetch(program.guildId).catch(() => null);
        const { results, sorted } = await fosterService.buildFinalResults(guild, program);
        await fosterService.endProgram(message.guild, client);

        await message.channel.send(results);
        await message.channel.send('🎉 **Foster Program complete! Great teamwork everyone!**');

        // Achievement tracking — safe iteration
        try {
          for (const pair of program.pairs) {
            await profileService.incrementAchievement(pair.mentorId, 'achievements.fosterParticipation');
            await profileService.incrementAchievement(pair.partnerId, 'achievements.fosterParticipation');
          }
          // Top pair gets fosterWins
          if (sorted && sorted.length > 0) {
            await profileService.incrementAchievement(sorted[0].mentorId, 'achievements.fosterWins');
            await profileService.incrementAchievement(sorted[0].partnerId, 'achievements.fosterWins');
          }
        } catch (achErr) {
          console.error('[FosterProgram] Achievement tracking error:', achErr.message);
        }

        await message.react('🏆');

      } catch (err) {
        console.error('[FosterProgram] End error:', err);
        await message.reply('❌ Failed to end the foster program.').catch(() => {});
      }
      return;
    }
  }
};
