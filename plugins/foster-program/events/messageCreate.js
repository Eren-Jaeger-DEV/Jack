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
const visionService = require('../../../bot/utils/visionService');
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
  const content = message.content.trim().toLowerCase();

  /* ── 1. Must have an image attachment ── */
  const attachment = message.attachments.find(a =>
    a.contentType?.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(a.name ?? '')
  );

  if (!attachment) {
    const warn = await message.reply('📎 **Jack:** Attach your **"All Data" stats card screenshot** (Current Season) to this message.');
    setTimeout(() => warn.delete().catch(() => {}), 8000);
    return;
  }

  /* ── 2. Determine Submission Type (initial/final) ── */
  // Priority: 1. Manual keyword, 2. Program status inference
  let type = content.includes('final') ? 'final' : (content.includes('initial') ? 'initial' : null);
  
  if (!type) {
    if (program.status === 'PAIRING_VERIFICATION') type = 'initial';
    else if (program.status === 'VERIFICATION_FINAL') type = 'final';
    else {
      return await message.reply('❓ **Jack:** I\'m not sure if this is your `initial` or `final` card. Please type the keyword with your image.');
    }
  }

  /* ── 3. Verify user is an active participant ── */
  const pix = program.pairs.findIndex(p => p.mentorId === userId || p.partnerId === userId);
  if (pix === -1) {
    const warn = await message.reply('❌ **Jack:** You are not listed in any active pair for this program.');
    setTimeout(() => warn.delete().catch(() => {}), 8000);
    return;
  }

  /* ── 4. Processing indicator ── */
  await message.react('🔍').catch(() => {});
  await message.channel.sendTyping().catch(() => {});

  /* ── 5. AI Screenshot Verification (Gemini Vision) ── */
  const aiResult = await visionService.extractSynergyPoints(attachment.url);
  await message.reactions.removeAll().catch(() => {});

  if (!aiResult || aiResult.points === 0) {
    return await message.reply(
      '🚫 **Jack:** Telemetry failed. Could not read your stats card.\n' +
      'Ensure the **"All Data"** window is open and the **"Team-up points earned"** number is visible.'
    );
  }

  const points = aiResult.points;
  const selection = aiResult.selection;

  // Optional: Log what we found
  logger.info("FosterSubmission", `User ${message.author.tag} submitted ${points} pts (Selection: ${selection}, Type: ${type})`);

  /* ── 6. Submit to the service (handles 50/50 pooling + DB save) ── */
  const freshProgram = await fosterService.getActiveProgram(message.guild.id);
  if (!freshProgram) return;

  const result = await fosterService.submitSynergyCard(
    userId,
    points,
    type,
    selection,
    attachment.url,
    freshProgram
  );

  if (!result.success) {
    return await message.reply(`❌ **Jack:** ${result.error}`);
  }

  /* ── 7. Respond based on match result ── */
  if (result.matched) {
    const embed = new EmbedBuilder().setTimestamp();

    if (type === 'initial') {
      embed
        .setTitle('✅ Baseline Synchronized')
        .setColor('#00FFCC')
        .setDescription(
          `Both partners' baselines are recorded.\n\n` +
          `> **Your Start:** \`${points}\`\n` +
          `> **Partner Start:** \`${result.partnerValue}\`\n\n` +
          `I will measure your combined growth in 5 days. Operation active. 🎯`
        )
        .setThumbnail(attachment.url);
    } else {
      embed
        .setTitle('🏆 Cycle Success — 50/50 Split Applied!')
        .setColor('#FFD700')
        .setDescription(
          `Final stats verified for both partners!\n\n` +
          `> **Combined Growth:** \`${result.totalGrowth}\` points\n` +
          `> **Shared Credit (50%):** \`${result.split}\` points each\n\n` +
          `Global Leaderboards updated. Excellent coordination. 📊`
        )
        .setThumbnail(attachment.url);

      await fosterService.refreshLeaderboard(client, freshProgram).catch(() => {});
    }

    await message.reply({ embeds: [embed] });
  } else {
    const pair = freshProgram.pairs[pix];
    const partnerId = pair.mentorId === userId ? pair.partnerId : pair.mentorId;

    await message.reply(
      `⏳ **Jack:** Data logged. I've recorded your **${type}** stats: **${points}** points (Category: ${selection}).\n\n` +
      `Waiting for your partner <@${partnerId}> to submit their card.`
    );
  }
}
