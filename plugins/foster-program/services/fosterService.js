/**
 * fosterService.js — Core business logic for the Foster Program
 *
 * All pairing, rotation, phase, point validation, and leaderboard logic lives here.
 */

const FosterProgram = require('../models/FosterProgram');
const Player = require('../../../bot/database/models/Player');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/* ── Constants ── */
const FOSTER_CHANNEL_ID   = '1477984930909786134';
const CLAN_MEMBER_ROLE_ID = '1477856665817714699';
const MENTOR_ROLE_ID      = '1484354630140821705';
const ROOKIE_ROLE_ID      = '1484354913671839835';
const NEWBIE_ROLE_ID      = '1484348917079478454';
const ROTATION_DAYS       = 5;
const PHASE_DAYS          = 15;
const SUBMISSION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const PLAYERS_PER_PAGE    = 10;
const MENTOR_COUNT        = 15;
const ROOKIE_COUNT        = 10;

/**
 * Get current date/time in IST.
 */
function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

/* ═══════════════════════════════════════════
 *  PROGRAM LIFECYCLE
 * ═══════════════════════════════════════════ */

async function getActiveProgram(guildId) {
  return FosterProgram.findOne({ guildId, active: true });
}

/**
 * Start the foster program:
 * 1. Fetch eligible players sorted by seasonSynergy
 * 2. Assign top 15 as Mentors, bottom 10 as Rookies
 * 3. Include Newbie-role holders as additional low-tier partners
 * 4. Create pairs and store
 */
async function startProgram(guild, client) {
  // Fetch all registered clan members
  await guild.members.fetch().catch(() => {});

  const clanMembers = guild.members.cache.filter(m =>
    m.roles.cache.has(CLAN_MEMBER_ROLE_ID) && !m.user.bot
  );

  // Get registered players with seasonSynergy, sorted desc
  const playerIds = clanMembers.map(m => m.id);
  const players = await Player.find({ discordId: { $in: playerIds }, ign: { $exists: true, $ne: '' } })
    .sort({ seasonSynergy: -1 });

  if (players.length < 2) {
    return { success: false, error: 'Not enough registered clan members to start the program.' };
  }

  // Top N → Mentors, Bottom N → Rookies
  const mentorCount = Math.min(MENTOR_COUNT, Math.floor(players.length / 2));
  const mentorPlayers = players.slice(0, mentorCount);
  const mentorIds = new Set(mentorPlayers.map(p => p.discordId));

  // Rookies: remaining registered players + anyone with Newbie role (not already a mentor)
  const rookieCandidates = players.filter(p => !mentorIds.has(p.discordId));

  // Also include members with Newbie role who are registered but not already in the list
  const newbieMembers = clanMembers.filter(m =>
    m.roles.cache.has(NEWBIE_ROLE_ID) && !mentorIds.has(m.id)
  );
  const existingRookieIds = new Set(rookieCandidates.map(p => p.discordId));
  for (const [, m] of newbieMembers) {
    if (!existingRookieIds.has(m.id)) {
      const p = await Player.findOne({ discordId: m.id, ign: { $exists: true, $ne: '' } });
      if (p) rookieCandidates.push(p);
    }
  }

  // Cap rookies
  const rookiePlayers = rookieCandidates.slice(0, Math.max(ROOKIE_COUNT, rookieCandidates.length));

  if (rookiePlayers.length === 0) {
    return { success: false, error: 'No eligible rookies/newbies found.' };
  }

  // Assign roles
  for (const p of mentorPlayers) {
    const member = guild.members.cache.get(p.discordId);
    if (member) {
      await member.roles.add(MENTOR_ROLE_ID).catch(() => {});
      await member.roles.remove(ROOKIE_ROLE_ID).catch(() => {});
    }
  }
  for (const p of rookiePlayers) {
    const member = guild.members.cache.get(p.discordId);
    if (member) {
      await member.roles.add(ROOKIE_ROLE_ID).catch(() => {});
      await member.roles.remove(MENTOR_ROLE_ID).catch(() => {});
    }
  }

  // Create pairs
  const pairCount = Math.min(mentorPlayers.length, rookiePlayers.length);
  const pairs = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push({
      mentorId: mentorPlayers[i].discordId,
      partnerId: rookiePlayers[i].discordId,
      points: 0
    });
  }

  const now = getIST();
  const program = await FosterProgram.create({
    guildId: guild.id,
    active: true,
    phase: 1,
    rotationIndex: 0,
    startedAt: now,
    lastRotation: now,
    pairs,
    pendingSubmissions: [],
    submittedThisCycle: []
  });

  console.log(`[FosterProgram] Started with ${pairs.length} pairs (${mentorPlayers.length} mentors, ${rookiePlayers.length} rookies).`);
  return { success: true, program };
}

/**
 * End the foster program: clean up roles, deactivate.
 */
async function endProgram(guild, client) {
  const program = await getActiveProgram(guild.id);
  if (!program) return { success: false, error: 'No active foster program.' };

  // Remove roles from all participants
  await guild.members.fetch().catch(() => {});
  for (const pair of program.pairs) {
    const mentor = guild.members.cache.get(pair.mentorId);
    if (mentor) await mentor.roles.remove(MENTOR_ROLE_ID).catch(() => {});
    const partner = guild.members.cache.get(pair.partnerId);
    if (partner) await partner.roles.remove(ROOKIE_ROLE_ID).catch(() => {});
  }

  // Delete old leaderboard
  await deleteOldLeaderboardMessage(client, program);

  // Deactivate
  program.active = false;
  await program.save();

  console.log(`[FosterProgram] Program ended in guild ${guild.id}.`);
  return { success: true, program };
}

/* ═══════════════════════════════════════════
 *  ROTATION
 * ═══════════════════════════════════════════ */

/**
 * Rotate partners using circular shift.
 * Mentors stay fixed, partners shift by one position.
 */
function rotatePairs(program) {
  if (program.pairs.length < 2) return;

  // Circular shift: take last partner, move it to front
  const partners = program.pairs.map(p => p.partnerId);
  const lastPartner = partners.pop();
  partners.unshift(lastPartner);

  for (let i = 0; i < program.pairs.length; i++) {
    program.pairs[i].partnerId = partners[i];
  }

  program.rotationIndex += 1;
  program.lastRotation = getIST();
  program.submittedThisCycle = []; // Reset submissions for new cycle

  console.log(`[FosterProgram] Rotated partners. Rotation index: ${program.rotationIndex}`);
}

/* ═══════════════════════════════════════════
 *  PHASE TRANSITION
 * ═══════════════════════════════════════════ */

/**
 * Advance to next phase: recalculate roles and pairs from fresh seasonSynergy.
 */
async function advancePhase(guild, client, program) {
  console.log(`[FosterProgram] Advancing to phase ${program.phase + 1}.`);

  // Remove all old roles
  await guild.members.fetch().catch(() => {});
  for (const pair of program.pairs) {
    const mentor = guild.members.cache.get(pair.mentorId);
    if (mentor) await mentor.roles.remove(MENTOR_ROLE_ID).catch(() => {});
    const partner = guild.members.cache.get(pair.partnerId);
    if (partner) await partner.roles.remove(ROOKIE_ROLE_ID).catch(() => {});
  }

  // Re-fetch and sort players
  const clanMembers = guild.members.cache.filter(m =>
    m.roles.cache.has(CLAN_MEMBER_ROLE_ID) && !m.user.bot
  );
  const playerIds = clanMembers.map(m => m.id);
  const players = await Player.find({ discordId: { $in: playerIds }, ign: { $exists: true, $ne: '' } })
    .sort({ seasonSynergy: -1 });

  const mentorCount = Math.min(MENTOR_COUNT, Math.floor(players.length / 2));
  const mentorPlayers = players.slice(0, mentorCount);
  const mentorIds = new Set(mentorPlayers.map(p => p.discordId));
  const rookiePlayers = players.filter(p => !mentorIds.has(p.discordId)).slice(0, ROOKIE_COUNT);

  // Assign new roles
  for (const p of mentorPlayers) {
    const member = guild.members.cache.get(p.discordId);
    if (member) {
      await member.roles.add(MENTOR_ROLE_ID).catch(() => {});
      await member.roles.remove(ROOKIE_ROLE_ID).catch(() => {});
    }
  }
  for (const p of rookiePlayers) {
    const member = guild.members.cache.get(p.discordId);
    if (member) {
      await member.roles.add(ROOKIE_ROLE_ID).catch(() => {});
      await member.roles.remove(MENTOR_ROLE_ID).catch(() => {});
    }
  }

  // Create new pairs (carry over old points by mentor where possible)
  const pairCount = Math.min(mentorPlayers.length, rookiePlayers.length);
  const oldPointsMap = {};
  for (const pair of program.pairs) {
    oldPointsMap[pair.mentorId] = pair.points;
  }

  const newPairs = [];
  for (let i = 0; i < pairCount; i++) {
    newPairs.push({
      mentorId: mentorPlayers[i].discordId,
      partnerId: rookiePlayers[i].discordId,
      points: oldPointsMap[mentorPlayers[i].discordId] || 0
    });
  }

  program.phase += 1;
  program.rotationIndex = 0;
  program.lastRotation = getIST();
  program.pairs = newPairs;
  program.pendingSubmissions = [];
  program.submittedThisCycle = [];

  await program.save();
  console.log(`[FosterProgram] Phase ${program.phase} started with ${newPairs.length} pairs.`);
}

/* ═══════════════════════════════════════════
 *  POINT SYSTEM (DUAL VALIDATION)
 * ═══════════════════════════════════════════ */

/**
 * Submit foster points. Both pair members must submit the same value
 * with a screenshot within 10 minutes for points to count.
 */
async function submitPoints(userId, value, screenshotUrl, program) {
  // Find which pair the user belongs to
  const pairIndex = program.pairs.findIndex(
    p => p.mentorId === userId || p.partnerId === userId
  );
  if (pairIndex === -1) {
    return { success: false, error: 'You are not in an active pair.' };
  }

  // Check if already submitted this cycle
  if (program.submittedThisCycle.includes(userId)) {
    return { success: false, error: 'You have already submitted points this rotation cycle.' };
  }

  // Check if there's an existing pending submission from the partner
  const pair = program.pairs[pairIndex];
  const partnerId = pair.mentorId === userId ? pair.partnerId : pair.mentorId;

  const existingIdx = program.pendingSubmissions.findIndex(
    s => s.pairIndex === pairIndex && s.userId === partnerId
  );

  if (existingIdx >= 0) {
    const existing = program.pendingSubmissions[existingIdx];
    const timeDiff = Date.now() - new Date(existing.timestamp).getTime();

    if (timeDiff > SUBMISSION_WINDOW_MS) {
      // Expired — discard both
      program.pendingSubmissions.splice(existingIdx, 1);
      await program.save();
      return { success: false, error: 'Your partner\'s submission expired (>10 min). Both discarded. Try again together.' };
    }

    if (existing.value !== value) {
      // Mismatch — discard both
      program.pendingSubmissions.splice(existingIdx, 1);
      await program.save();
      return { success: false, error: 'Submission rejected. Both players must submit the same value.' };
    }

    // Match! Award points
    program.pairs[pairIndex].points += value;
    program.pendingSubmissions.splice(existingIdx, 1);
    program.submittedThisCycle.push(userId);
    program.submittedThisCycle.push(partnerId);
    await program.save();

    console.log(`[FosterProgram] Pair ${pairIndex} awarded ${value} points (dual validated).`);
    return { success: true, matched: true, points: value };
  }

  // No existing submission — store as pending
  program.pendingSubmissions.push({
    pairIndex,
    userId,
    value,
    screenshotUrl,
    timestamp: new Date()
  });
  program.submittedThisCycle.push(userId);
  await program.save();

  return { success: true, matched: false, waitingFor: partnerId };
}

/* ═══════════════════════════════════════════
 *  ROTATION / PHASE CHECKER
 * ═══════════════════════════════════════════ */

/**
 * Check if rotation or phase transition is due.
 * Called periodically from index.js.
 */
async function checkRotationAndPhase(client) {
  const programs = await FosterProgram.find({ active: true });

  for (const program of programs) {
    try {
      const now = getIST();
      const lastRot = new Date(program.lastRotation);
      const daysSinceRotation = (now.getTime() - lastRot.getTime()) / (1000 * 60 * 60 * 24);

      const started = new Date(program.startedAt);
      const daysSinceStart = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);

      // Phase transition at 15 days
      if (program.phase === 1 && daysSinceStart >= PHASE_DAYS) {
        const guild = client.guilds.cache.get(program.guildId);
        if (guild) {
          await advancePhase(guild, client, program);
          await refreshLeaderboard(client, program);
        }
        continue;
      }

      // Auto-end at 30 days
      if (daysSinceStart >= PHASE_DAYS * 2) {
        const guild = client.guilds.cache.get(program.guildId);
        if (guild) {
          console.log(`[FosterProgram] Auto-ending program after 30 days.`);
          await endProgram(guild, client);
        }
        continue;
      }

      // Rotation every 5 days
      if (daysSinceRotation >= ROTATION_DAYS) {
        // Expire pending submissions
        program.pendingSubmissions = [];
        rotatePairs(program);
        await program.save();
        await refreshLeaderboard(client, program);
      }
    } catch (err) {
      console.error(`[FosterProgram] Check error for guild ${program.guildId}:`, err.message);
    }
  }
}

/* ═══════════════════════════════════════════
 *  LEADERBOARD
 * ═══════════════════════════════════════════ */

async function getLeaderboardPage(program, page = 0) {
  const sorted = [...program.pairs].sort((a, b) => b.points - a.points);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PLAYERS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const start = safePage * PLAYERS_PER_PAGE;
  const slice = sorted.slice(start, start + PLAYERS_PER_PAGE);

  // Resolve IGNs
  const allIds = [];
  for (const p of slice) { allIds.push(p.mentorId, p.partnerId); }
  const players = await Player.find({ discordId: { $in: allIds } });
  const nameMap = {};
  for (const p of players) { nameMap[p.discordId] = p.ign || p.discordId; }

  let board = '```md\n';
  board += padRight('Pairs', 30) + padRight('Combined Synergy', 16) + '\n';
  board += '─'.repeat(46) + '\n';

  if (slice.length === 0) {
    board += 'No pairs yet.\n';
  } else {
    for (let i = 0; i < slice.length; i++) {
      const rank = start + i + 1;
      const p = slice[i];
      const mentorName = truncate(nameMap[p.mentorId] || p.mentorId, 12);
      const partnerName = truncate(nameMap[p.partnerId] || p.partnerId, 12);
      const pairStr = `${rank}. ${mentorName} - ${partnerName}`;
      board += padRight(pairStr, 30) + padRight(String(p.points), 16) + '\n';
    }
  }

  board += '```';

  const embed = new EmbedBuilder()
    .setTitle('🤝 Foster Program')
    .setDescription(board)
    .setFooter({ text: `Phase ${program.phase} • Rotation ${program.rotationIndex + 1} • Page ${safePage + 1}/${totalPages}` })
    .setColor('#FFD700');

  return { embed, page: safePage, totalPages };
}

function buildButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`foster_lb_prev_${page}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`foster_lb_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

async function refreshLeaderboard(client, program, page = 0) {
  try {
    const channel = await client.channels.fetch(FOSTER_CHANNEL_ID).catch(() => null);
    if (!channel) return null;

    await deleteOldLeaderboardMessage(client, program);

    const lb = await getLeaderboardPage(program, page);
    const components = lb.totalPages > 1 ? [buildButtons(lb.page, lb.totalPages)] : [];

    const msg = await channel.send({ embeds: [lb.embed], components });

    program.leaderboardMessageId = msg.id;
    await program.save();

    return msg;
  } catch (err) {
    console.error('[FosterProgram] Failed to refresh leaderboard:', err.message);
    return null;
  }
}

async function deleteOldLeaderboardMessage(client, program) {
  if (!program.leaderboardMessageId) return;
  try {
    const channel = await client.channels.fetch(FOSTER_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const oldMsg = await channel.messages.fetch(program.leaderboardMessageId).catch(() => null);
    if (oldMsg) {
      await oldMsg.delete().catch(() => {});
    } else {
      program.leaderboardMessageId = null;
      await program.save();
    }
  } catch (err) {
    program.leaderboardMessageId = null;
    await program.save().catch(() => {});
  }
}

/**
 * Build final results for program end.
 */
async function buildFinalResults(program) {
  const sorted = [...program.pairs].sort((a, b) => b.points - a.points);
  const allIds = [];
  for (const p of sorted) { allIds.push(p.mentorId, p.partnerId); }
  const players = await Player.find({ discordId: { $in: allIds } });
  const nameMap = {};
  for (const p of players) { nameMap[p.discordId] = p.ign || p.discordId; }

  let results = '```\n🏆 Foster Program Final Results\n\n';
  results += padRight('', 4) + padRight('Pair', 30) + 'Points\n';
  results += '─'.repeat(44) + '\n';

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const pairStr = `${truncate(nameMap[p.mentorId] || '?', 12)} - ${truncate(nameMap[p.partnerId] || '?', 12)}`;
    results += padRight(String(i + 1), 4) + padRight(pairStr, 30) + String(p.points) + '\n';
  }

  results += '```';
  return { results, sorted };
}

/* ── Helpers ── */

function padRight(str, len) {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function truncate(str, max) {
  if (!str) return 'Unknown';
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}

/* ── Exports ── */

module.exports = {
  getActiveProgram,
  startProgram,
  endProgram,
  rotatePairs,
  advancePhase,
  submitPoints,
  checkRotationAndPhase,
  getLeaderboardPage,
  buildButtons,
  refreshLeaderboard,
  deleteOldLeaderboardMessage,
  buildFinalResults,
  FOSTER_CHANNEL_ID,
  CLAN_MEMBER_ROLE_ID,
  MENTOR_ROLE_ID,
  ROOKIE_ROLE_ID,
  NEWBIE_ROLE_ID,
  ROTATION_DAYS,
  PHASE_DAYS
};
