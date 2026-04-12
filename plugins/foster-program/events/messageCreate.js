/**
 * messageCreate.js — Foster Program Thread-Based Submission
 *
 * NEW SIMPLE SYSTEM:
 *  No commands. Users just post in the submission thread:
 *
 *    "initial 450"   ←  type keyword + points number
 *    [screenshot]    ←  "All Data" stats card attached
 *
 *  Jack automatically verifies with AI, records the submission,
 *  and awards points when both partners post the same value.
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fosterService = require('../services/fosterService');
const aiService     = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const logger        = require('../../../utils/logger');

module.exports = async (client, message) => {
  if (message.author.bot || !message.guild) return;

  // V2 TRIGGER: Admin Announcement Detection
  const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
  const content = message.content.trim().toLowerCase();

  // Debug trigger
  if (content.includes('foster program starts') || content === 'h manual' || content === 'h refresh') {
    logger.info("FosterV2", `Potential trigger from ${message.author.tag} | Admin: ${isAdmin} | Channel: ${message.channel.id}`);
  }

  if (isAdmin && (content.includes('foster program starts') || content === 'h manual' || content === 'h refresh')) {
    const config = await configManager.getGuildConfig(message.guild.id);
    if (message.channel.id === config?.settings?.fosterChannelId || content === 'h manual' || content === 'h refresh') {
      if (content === 'h refresh') {
        const program = await fosterService.getActiveProgram(message.guild.id).catch(() => null);
        if (program) {
          await fosterService.refreshLeaderboard(client, program);
          await message.react('✅');
        }
        return;
      }
      await fosterService.sendStartConfirmation(message);
      return;
    }
  }

  const program = await fosterService.getActiveProgram(message.guild.id).catch(() => null);
  if (!program) return;

  /* ────────────────────────────────────────────────
   *  ACTIVE PHASE: Thread-only submission capture
   * ──────────────────────────────────────────────── */
  if (program.status === 'ACTIVE' || program.status === 'PAIRING_VERIFICATION') {
    // Only process messages in the designated submission thread
    if (program.submissionThreadId && message.channel.id === program.submissionThreadId) {
      await handleSubmission(client, message, program);
    }
    return;
  }

  /* ──────────────────────────────────────
   *  REGISTRATION PHASE: Thread sign-ups
   * ────────────────────────────────────── */
  if (program.status === 'REGISTRATION') {
    const threadId = message.channel.id;
    const reg      = program.registration;

    let roleType = null;
    if (threadId === reg.mentorThreadId)        roleType = 'MENTOR';
    else if (threadId === reg.neophyteThreadId) roleType = 'NEOPHYTE';
    else if (threadId === reg.veteranThreadId)  roleType = 'VETERAN';

    if (!roleType) return;

    try {
      // Process registration (IGN verification)
      await fosterService.processThreadRegistration(message, roleType);
    } catch (err) {
      logger.error("FosterProgram", `Thread registration error: ${err.message}`);
    }
  }

  /* ──────────────────────────────────────
   *  WILDCARD PHASE: Foster Channel
   * ────────────────────────────────────── */
  const config = await configManager.getGuildConfig(message.guild.id);
  if (program.status === 'REGISTRATION' && message.channel.id === config?.settings?.fosterChannelId) {
    const content = message.content.trim();
    if (content.length > 2 && !content.includes(' ')) {
      // Logic for wildcard entry
      await fosterService.processWildcardEntry(message);
    }
  }
};

/* ─────────────────────────────────────────────────────────────────
 *  HANDLER — processes a submission message in the stat card thread
 * ───────────────────────────────────────────────────────────────── */
async function handleSubmission(client, message, program) {
  const userId  = message.author.id;
  const content = message.content.trim();

  /* ── 1. Must have an image attachment ── */
  const attachment = message.attachments.find(a =>
    a.contentType?.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(a.name ?? '')
  );

  if (!attachment) {
    const warn = await message.reply(
      '📎 **Jack:** Attach your **"All Data" stats card screenshot** to the message.\n' +
      '> Format: `initial 450` + screenshot  *(or `final 600`)*'
    );
    setTimeout(() => warn.delete().catch(() => {}), 12000);
    return;
  }

  /* ── 2. Parse "initial" or "final" keyword ── */
  const typeMatch = content.match(/\b(initial|final)\b/i);
  if (!typeMatch) {
    const warn = await message.reply(
      '❓ **Jack:** Include **`initial`** or **`final`** in your message.\n' +
      '> Example: `initial 450`  or  `final 600`'
    );
    setTimeout(() => warn.delete().catch(() => {}), 12000);
    return;
  }
  const type = typeMatch[1].toLowerCase();

  /* ── 3. Parse points number ── */
  const pointsMatch = content.match(/\b(\d+)\b/);
  if (!pointsMatch) {
    const warn = await message.reply(
      '🔢 **Jack:** Include your **Team-up points** number.\n' +
      '> Example: `initial 450`'
    );
    setTimeout(() => warn.delete().catch(() => {}), 12000);
    return;
  }
  const points = parseInt(pointsMatch[1], 10);

  /* ── 4. Verify user is an active participant ── */
  const pix = program.pairs.findIndex(
    p => p.mentorId === userId || p.partnerId === userId
  );
  if (pix === -1) {
    const warn = await message.reply('❌ **Jack:** You are not listed in any active pair.');
    setTimeout(() => warn.delete().catch(() => {}), 8000);
    return;
  }

  /* ── 5. Processing indicator ── */
  await message.react('🔍').catch(() => {});
  await message.channel.sendTyping().catch(() => {});

  /* ── 6. AI Screenshot Verification (Gemini OCR) ── */
  const extracted = await aiService.extractSynergyPoints(attachment.url);

  await message.reactions.removeAll().catch(() => {});

  if (extracted === null || extracted === undefined) {
    return await message.reply(
      '🚫 **Jack:** Could not read your screenshot.\n' +
      'Make sure the **"All Data"** card is fully visible with **"Team-up points earned"** clearly readable.'
    );
  }

  if (extracted !== points) {
    return await message.reply(
      `⚠️ **Jack:** Points mismatch!\n` +
      `You wrote **${points}** but the screenshot shows **${extracted}**.\n\n` +
      `Fix the number and repost.`
    );
  }

  /* ── 7. Submit to the service (handles partner matching + DB save) ── */
  // Re-fetch fresh from DB to avoid stale program state
  const freshProgram = await fosterService.getActiveProgram(message.guild.id);
  if (!freshProgram) return;

  const result = await fosterService.submitSynergyCard(
    userId,
    points,
    type,
    attachment.url,
    freshProgram
  );

  if (!result.success) {
    return await message.reply(`❌ **Jack:** ${result.error}`);
  }

  /* ── 8. Respond based on match result ── */
  if (result.matched) {
    const embed = new EmbedBuilder().setTimestamp();

    if (type === 'initial') {
      embed
        .setTitle('✅ Baseline Locked In!')
        .setColor('#00FFCC')
        .setDescription(
          `Both partners confirmed their Day 1 baseline of **${points}** Team-up points.\n\n` +
          `Jack will measure your growth on Day 5. Keep it up! 🔥`
        )
        .setThumbnail(attachment.url);
    } else {
      embed
        .setTitle('🏆 Cycle Complete — Points Awarded!')
        .setColor('#FFD700')
        .setDescription(
          `Both partners' final stats verified!\n\n` +
          `> **Total Growth:** \`${result.points}\` points\n` +
          `> **Each Partner's Share (50%):** \`${result.split}\`\n\n` +
          `Global Rankings updated! 📊`
        )
        .setThumbnail(attachment.url);

      // Refresh leaderboard
      await fosterService.refreshLeaderboard(client, freshProgram).catch(() => {});
    }

    await message.reply({ embeds: [embed] });

  } else {
    // Waiting for partner
    const pair      = freshProgram.pairs[pix];
    const partnerId = pair.mentorId === userId ? pair.partnerId : pair.mentorId;

    await message.reply(
      `⏳ **Jack:** Recorded! Your **${type}** submission of **${points}** points is saved.\n\n` +
      `Waiting for your partner <@${partnerId}> to post their stats in this thread.`
    );
  }
}
