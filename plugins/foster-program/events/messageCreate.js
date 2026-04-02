const { EmbedBuilder } = require('discord.js');
const fosterService = require('../services/fosterService');
// Bug 3 fix: import directly so the reference is always valid — never rely on client.commands
const { pendingScreenshots } = require('../commands/fs');

/**
 * messageCreate.js — Hub for:
 *  1. REGISTRATION phase thread sign-ups (IGN input)
 *  2. ACTIVE phase screenshot capture (2-step /fs submit flow)
 */
module.exports = async (client, message) => {
  if (message.author.bot || !message.guild) return;

  const program = await fosterService.getActiveProgram(message.guild.id).catch(() => null);
  if (!program) return;

  /* ────────────────────────────────
   *  ACTIVE PHASE: Screenshot catch
   * ──────────────────────────────── */
  if (program.status === 'ACTIVE') {
    const entry = pendingScreenshots.get(message.author.id);
    if (!entry) return;

    // Must be sent in the same channel/thread where the command was used
    if (message.channel.id !== entry.channelId) return;

    // Must have an image attachment
    const attachment = message.attachments.find(a =>
      a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(a.name ?? '')
    );

    if (!attachment) {
      // Gently remind them
      return await message.reply(
        '⚠️ **Jack:** That doesn\'t look like an image. Please send a **screenshot** of your "All Data" stats card.'
      );
    }

    // Check if still within the 3-minute window
    if (Date.now() - entry.timestamp > 3 * 60 * 1000) {
      pendingScreenshots.delete(message.author.id);
      return await message.reply('❌ **Jack:** Your submission window expired. Please run `/fs submit` again.');
    }

    // Remove entry immediately so duplicate images don't retrigger
    pendingScreenshots.delete(message.author.id);

    // Provide immediate feedback
    const processingMsg = await message.reply('🔍 **Jack:** Analyzing your screenshot... please wait.');

    // Show a typing indicator while processing
    await message.channel.sendTyping().catch(() => {});

    try {
      const result = await fosterService.submitSynergyCard(
        message.author.id,
        entry.points,
        entry.type,
        attachment.url,
        program
      );

      // Delete the processing indicator
      await processingMsg.delete().catch(() => {});

      if (!result.success) {
        return await message.reply(`❌ **Jack:** ${result.error}`);
      }

      if (result.matched) {
        const embed = new EmbedBuilder().setTimestamp();

        if (entry.type === 'initial') {
          embed
            .setTitle('✅ Baseline Recorded!')
            .setColor('#00FFCC')
            .setDescription(
              `Both partners confirmed their initial baseline of **${entry.points}** Team-up points.\n\n` +
              `Jack will measure your growth on Day 5. Good luck! 🔥`
            );
        } else {
          embed
            .setTitle('🏆 Cycle Verified — Points Awarded!')
            .setColor('#FFD700')
            .setDescription(
              `Cycle complete! Both partners matched their final stats.\n\n` +
              `> **Total Pair Points:** \`${result.points}\`\n` +
              `> **Your Share (50%):** \`${result.split}\`\n\n` +
              `The Global Rankings have been updated!`
            );

          // Refresh the leaderboard automatically
          await fosterService.refreshLeaderboard(client, program).catch(() => {});
        }

        embed.setThumbnail(attachment.url);
        return await message.reply({ embeds: [embed] });
      } else {
        // Waiting for partner
        return await message.reply(
          `⏳ **Jack:** Locked in! Your **${entry.type}** submission of **${entry.points}** points is recorded.\n\n` +
          `Now waiting for your partner <@${result.waitingFor}> to submit the same value within 15 minutes.`
        );
      }
    } catch (err) {
      console.error('[FosterProgram] Screenshot processing error:', err);
      await message.reply('❌ **Jack:** Something went wrong processing your screenshot. Try again.').catch(() => {});
    }

    return;
  }

  /* ──────────────────────────────────────
   *  REGISTRATION PHASE: Thread sign-ups
   * ────────────────────────────────────── */
  if (program.status === 'REGISTRATION') {
    const threadId = message.channel.id;
    const reg = program.registration;

    let roleType = null;
    if (threadId === reg.mentorThreadId)   roleType = 'MENTOR';
    else if (threadId === reg.neophyteThreadId) roleType = 'NEOPHYTE';
    else if (threadId === reg.veteranThreadId)  roleType = 'VETERAN';

    if (!roleType) return;

    try {
      await fosterService.processThreadRegistration(message, roleType);
    } catch (err) {
      console.error('[FosterProgram] Thread registration error:', err.message);
    }
  }
};
