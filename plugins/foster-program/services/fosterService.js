/**
 * fosterService.js — Core business logic for the Foster Program
 *
 * All pairing, rotation, phase, point validation, and leaderboard logic lives here.
 */

const FosterProgram = require('../models/FosterProgram');
const Player = require('../../../bot/database/models/Player');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { resolveDisplayName } = require('../../../bot/utils/nameResolver');
const configManager = require('../../../bot/utils/configManager');

/* ── Constants ── */
const ROTATION_DAYS       = 5;
const PHASE_DAYS          = 15;
const SUBMISSION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const POOL_EXPANSION_MS      = 6 * 60 * 60 * 1000;  // 6 hours
const PLAYERS_PER_PAGE    = 10;
const MENTOR_COUNT        = 15;
const PARTNER_COUNT       = 15;

/* ── Role Configuration ── */
const ROLES = {
  MENTOR:   '1484354630140821705',
  NEWCOMER: '1488835349571702935', // Input
  NEOPHYTE: '1484348917079478454', // Assigned
  VETERAN:  '1486183048247509123'  // Assigned
};

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
 * Initiate the Foster Program Registration Phase:
 * 1. Identify initial candidates (Top 15 Mentors, Newcomers, Bottom Veterans).
 * 2. Create 3 registration threads in the foster channel.
 * 3. Set expiration (24h).
 */
async function startProgram(guild, client) {
  const config = await configManager.getGuildConfig(guild.id);
  const fosterChannelId = config?.settings?.fosterChannelId;
  const clanMemberRoleId = config?.settings?.clanMemberRoleId;

  if (!fosterChannelId || !clanMemberRoleId) {
    return { success: false, error: 'Foster Channel or Clan Role not configured in `/setconfig` or settings.' };
  }

  const channel = await client.channels.fetch(fosterChannelId).catch(() => null);
  if (!channel) return { success: false, error: `Foster channel (${fosterChannelId}) not found or Jack lacks access.` };

  // 1. Clear any existing active program
  await FosterProgram.deleteMany({ guildId: guild.id, active: true });

  // 2. Fetch candidates
  await guild.members.fetch().catch(() => {});
  const clanMembers = guild.members.cache.filter(m => m.roles.cache.has(clanMemberRoleId) && !m.user.bot);
  const playerIds = clanMembers.map(m => m.id);
  const players = await Player.find({ discordId: { $in: playerIds }, ign: { $exists: true, $ne: '' } }).sort({ seasonSynergy: -1 });

  if (players.length < 30) {
    return { success: false, error: 'Not enough registered players (need at least 30) for a 15-pair program.' };
  }

  // Initial pools
  const top15Ids = players.slice(0, MENTOR_COUNT).map(p => p.discordId);
  const newcomerRoleHolders = clanMembers.filter(m => m.roles.cache.has(ROLES.NEWCOMER));
  const newcomerIds = newcomerRoleHolders.map(m => m.id);
  
  // 3. Create Main Instruction Message
  const mainEmbed = new EmbedBuilder()
    .setTitle('🤝 Foster Program: Registration Open!')
    .setDescription(`Welcome to the new Foster Program! We are looking for **15 Mentors** and **15 Partners**.\n\n**How to Register:**\n1. Find your category thread below.\n2. Write your **IGN** (In-Game Name) in the thread.\n3. Jack will verify your status and assign your role.\n\n*Registration closes in 24 hours or when slots are full.*`)
    .setColor('#00FFCC')
    .setTimestamp();

  await channel.send({ embeds: [mainEmbed] });

  // 4. Create Category Headers & Threads
  const mentorMsg = await channel.send('🛡️ **MENTOR REGISTRATION**\n*Reserved for Top 15 Synergy members.*');
  const mentorThread = await mentorMsg.startThread({ name: '📝 Mentor Registration', autoArchiveDuration: 1440 });

  const neophyteMsg = await channel.send('🔰 **NEOPHYTE REGISTRATION**\n*Reserved for Newcomers role holders.*');
  const neophyteThread = await neophyteMsg.startThread({ name: '📝 Neophyte Registration', autoArchiveDuration: 1440 });

  const veteranMsg = await channel.send('🎖️ **VETERAN REGISTRATION**\n*Reserved for older members filling gaps.*');
  const veteranThread = await veteranMsg.startThread({ name: '📝 Veteran Registration', autoArchiveDuration: 1440 });

  // 5. Initial Pings & Instructions
  await mentorThread.send(`**ATTENTION TOP 15:** <@${top15Ids.join('>, <@')}> \n\nYou have been selected as Mentor candidates! Write your **IGN** here to join the program.`);
  await neophyteThread.send(`**NEWCOMERS:** If you have the Newcomer role, write your **IGN** here to register as a Neophyte partner.`);
  await veteranThread.send(`**VETERANS:** If you are not in the Top 15 but want to mentor a newcomer, write your **IGN** here to register as a Veteran.`);

  // 6. Create Database Entry
  const expiresAt = new Date(Date.now() + REGISTRATION_WINDOW_MS);
  const program = await FosterProgram.create({
    guildId: guild.id,
    active: true,
    status: 'REGISTRATION',
    registration: {
      mentorThreadId: mentorThread.id,
      neophyteThreadId: neophyteThread.id,
      veteranThreadId: veteranThread.id,
      mentorPoolSize: 15,
      lastPoolExpansion: new Date(),
      expiresAt: expiresAt
    }
  });

  return { success: true, program };
}

/**
 * Handle IGN verification inside registration threads.
 */
async function processThreadRegistration(message, roleType) {
  const guild = message.guild;
  const userId = message.author.id;
  const ignInput = message.content.trim();

  // 1. Verify Player in DB
  const player = await Player.findOne({ discordId: userId });
  if (!player || player.ign.toLowerCase() !== ignInput.toLowerCase()) {
    return message.reply(`❌ **Jack:** I don't recognize that IGN for you. Make sure you typed it exactly as it appears in your \`/profile\`.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  // 2. Fetch Program
  const program = await getActiveProgram(guild.id);
  if (!program || program.status !== 'REGISTRATION') return;

  // 3. Category Checks
  let canJoin = false;
  let targetRole = null;
  let regList = null;

  if (roleType === 'MENTOR') {
    // Must be in top pool
    const clanMemberRoleId = (await configManager.getGuildConfig(guild.id))?.settings?.clanMemberRoleId;
    const clanMembers = guild.members.cache.filter(m => m.roles.cache.has(clanMemberRoleId));
    const topPlayers = await Player.find({ discordId: { $in: [...clanMembers.keys()] } }).sort({ seasonSynergy: -1 }).limit(program.registration.mentorPoolSize);
    if (topPlayers.some(p => p.discordId === userId)) {
      canJoin = true;
      targetRole = ROLES.MENTOR;
      regList = program.registration.registeredMentors;
    }
  } else if (roleType === 'NEOPHYTE') {
    if (message.member.roles.cache.has(ROLES.NEWCOMER)) {
      canJoin = true;
      targetRole = ROLES.NEOPHYTE;
      regList = program.registration.registeredNeophytes;
    }
  } else if (roleType === 'VETERAN') {
    // Everyone else can be a veteran if newcomers are low, but for simplicity we verify if they aren't mentors
    if (!program.registration.registeredMentors.includes(userId)) {
      canJoin = true;
      targetRole = ROLES.VETERAN;
      regList = program.registration.registeredVeterans;
    }
  }

  if (!canJoin) {
    return message.reply(`❌ **Jack:** You are not eligible for this category.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  if (regList.includes(userId)) {
    return message.reply(`⚠️ **Jack:** You are already registered, stop wasting my time.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
  }

  // 4. Success!
  regList.push(userId);
  await message.member.roles.add(targetRole).catch(() => {});
  await program.save();

  await message.react('✅');
  await message.reply(`✅ **Jack:** Registration confirmed. You are now a **${roleType}**. Wait for pairing.`).then(m => setTimeout(() => m.delete().catch(() => {}), 10000));

  // 5. Auto-Start Check
  if (program.registration.registeredMentors.length >= 15 && 
     (program.registration.registeredNeophytes.length + program.registration.registeredVeterans.length) >= 15) {
    await startActiveProgram(guild, message.client, program);
  }
}

/**
 * Transition from Registration to Active.
 */
async function startActiveProgram(guild, client, program) {
  console.log(`[FosterProgram] Finalizing registration for guild ${guild.id}`);

  const mentors = program.registration.registeredMentors;
  const partners = [...program.registration.registeredNeophytes, ...program.registration.registeredVeterans];

  // Equalize
  const pairCount = Math.min(mentors.length, partners.length);
  const finalMentors = mentors.slice(0, pairCount);
  const finalPartners = partners.slice(0, pairCount);

  const pairs = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push({
      mentorId: finalMentors[i],
      partnerId: finalPartners[i],
      points: 0
    });
  }

  // Setup program
  program.status = 'ACTIVE';
  program.pairs = pairs;
  program.startedAt = getIST();
  program.lastRotation = getIST();
  await program.save();

  // Archive Threads
  const channelId = (await configManager.getGuildConfig(guild.id))?.settings?.fosterChannelId;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel) {
    const threadIds = [program.registration.mentorThreadId, program.registration.neophyteThreadId, program.registration.veteranThreadId];
    for (const tid of threadIds) {
      if (!tid) continue;
      const thread = await channel.threads.fetch(tid).catch(() => null);
      if (thread) {
        await thread.setLocked(true);
        await thread.setArchived(true);
      }
    }
  }

  // Post Pairing List
  const { results } = await buildFinalResults(guild, program);
  if (channel) await channel.send(`🚀 **Foster Program is now ACTIVE!**\nRegistration closed. Here are your pairings:\n${results.replace('🏆 Foster Program Final Results', '🤝 Active Pairings')}`);

  await refreshLeaderboard(client, program);
}

/**
 * End the foster program: clean up roles, deactivate.
 */
async function endProgram(guild, client) {
  const program = await getActiveProgram(guild.id);
  if (!program) return { success: false, error: 'No active foster program.' };

  // Remove roles from all participants
  await guild.members.fetch().catch(() => {});
  const config = await configManager.getGuildConfig(guild.id);
  const mentorRoleId = config?.settings?.mentorRoleId;
  const rookieRoleId = config?.settings?.rookieRoleId;

  for (const pair of program.pairs) {
    const mentor = guild.members.cache.get(pair.mentorId);
    if (mentor && mentorRoleId) await mentor.roles.remove(mentorRoleId).catch(() => {});
    const partner = guild.members.cache.get(pair.partnerId);
    if (partner && rookieRoleId) await partner.roles.remove(rookieRoleId).catch(() => {});
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

  // Re-fetch and sort players
  const config = await configManager.getGuildConfig(guild.id);
  const clanMemberRoleId = config?.settings?.clanMemberRoleId;
  const mentorRoleId = config?.settings?.mentorRoleId;
  const rookieRoleId = config?.settings?.rookieRoleId;

  if (!clanMemberRoleId) return;

  const clanMembers = guild.members.cache.filter(m =>
    m.roles.cache.has(clanMemberRoleId) && !m.user.bot
  );
  const playerIds = clanMembers.map(m => m.id);
  const players = await Player.find({ discordId: { $in: playerIds }, ign: { $exists: true, $ne: '' } })
    .sort({ seasonSynergy: -1 });

  // Remove all old roles
  await guild.members.fetch().catch(() => {});
  for (const pair of program.pairs) {
    const mentor = guild.members.cache.get(pair.mentorId);
    if (mentor && mentorRoleId) await mentor.roles.remove(mentorRoleId).catch(() => {});
    const partner = guild.members.cache.get(pair.partnerId);
    if (partner && rookieRoleId) await partner.roles.remove(rookieRoleId).catch(() => {});
  }

  const mentorCount = Math.min(MENTOR_COUNT, Math.floor(players.length / 2));
  const mentorPlayers = players.slice(0, mentorCount);
  const mentorIds = new Set(mentorPlayers.map(p => p.discordId));
  const rookiePlayers = players.filter(p => !mentorIds.has(p.discordId)).slice(0, ROOKIE_COUNT);

  // Assign new roles
  for (const p of mentorPlayers) {
    const member = guild.members.cache.get(p.discordId);
    if (member) {
      if (mentorRoleId) await member.roles.add(mentorRoleId).catch(() => {});
      if (rookieRoleId) await member.roles.remove(rookieRoleId).catch(() => {});
    }
  }
  for (const p of rookiePlayers) {
    const member = guild.members.cache.get(p.discordId);
    if (member) {
      if (rookieRoleId) await member.roles.add(rookieRoleId).catch(() => {});
      if (mentorRoleId) await member.roles.remove(mentorRoleId).catch(() => {});
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
      const guild = client.guilds.cache.get(program.guildId);
      if (!guild) continue;

      const now = getIST();

      // 0. HANDLE REGISTRATION PROGRESS
      if (program.status === 'REGISTRATION') {
        // A. Pool Expansion (Every 6 hours)
        const timeSinceExpansion = now.getTime() - new Date(program.registration.lastPoolExpansion).getTime();
        if (timeSinceExpansion >= POOL_EXPANSION_MS && program.registration.registeredMentors.length < MENTOR_COUNT) {
          program.registration.mentorPoolSize += 5;
          program.registration.lastPoolExpansion = now;
          await program.save();

          const clanMemberRoleId = (await configManager.getGuildConfig(guild.id))?.settings?.clanMemberRoleId;
          const clanMembers = guild.members.cache.filter(m => m.roles.cache.has(clanMemberRoleId));
          const players = await Player.find({ discordId: { $in: [...clanMembers.keys()] } }).sort({ seasonSynergy: -1 }).limit(program.registration.mentorPoolSize);
          
          const newCandidates = players.slice(program.registration.mentorPoolSize - 5, program.registration.mentorPoolSize);
          if (newCandidates.length > 0) {
            const thread = await guild.channels.fetch(program.registration.mentorThreadId).catch(() => null);
            if (thread) {
              await thread.send(`**⚠️ POOL EXPANSION:** <@${newCandidates.map(c => c.discordId).join('>, <@')}> \n\nYou are now eligible as Mentor candidates! Type your **IGN** here to register.`);
            }
          }
        }

        // B. Expiration (24 hours)
        if (now.getTime() >= new Date(program.registration.expiresAt).getTime()) {
           await startActiveProgram(guild, client, program);
        }
        continue;
      }

      // 1. PHASE TRANSITION...

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

/**
 * Build a leaderboard string for a specific page.
 */
async function getLeaderboardPage(guild, program, page = 0) {
  const sorted = [...program.pairs].sort((a, b) => b.points - a.points);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PLAYERS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const start = safePage * PLAYERS_PER_PAGE;
  const slice = sorted.slice(start, start + PLAYERS_PER_PAGE);

  let board = '```md\n';
  board += padRight('Pairs', 30) + padRight('Combined Synergy', 16) + '\n';
  board += '─'.repeat(46) + '\n';

  if (slice.length === 0) {
    board += 'No pairs yet.\n';
  } else {
    for (let i = 0; i < slice.length; i++) {
      const rank = start + i + 1;
      const p = slice[i];
      
      const mentorName = await resolveDisplayName(guild, p.mentorId, 'Unknown');
      const partnerName = await resolveDisplayName(guild, p.partnerId, 'Unknown');
      
      const mentorTrunc = truncate(mentorName, 12);
      const partnerTrunc = truncate(partnerName, 12);
      const pairStr = `${rank}. ${mentorTrunc} - ${partnerTrunc}`;
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
    const config = await configManager.getGuildConfig(program.guildId);
    const fosterChannelId = config?.settings?.fosterChannelId;
    if (!fosterChannelId) return null;

    const channel = await client.channels.fetch(fosterChannelId).catch(() => null);
    if (!channel) return null;

    await deleteOldLeaderboardMessage(client, program);

    const guild = await client.guilds.fetch(program.guildId).catch(() => null);
    const lb = await getLeaderboardPage(guild, program, page);
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
  try {
    const config = await configManager.getGuildConfig(program.guildId);
    const fosterChannelId = config?.settings?.fosterChannelId;
    if (!fosterChannelId) return;

    const channel = await client.channels.fetch(fosterChannelId).catch(() => null);
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
async function buildFinalResults(guild, program) {
  const sorted = [...program.pairs].sort((a, b) => b.points - a.points);

  let results = '```\n🏆 Foster Program Final Results\n\n';
  results += padRight('', 4) + padRight('Pair', 30) + 'Points\n';
  results += '─'.repeat(44) + '\n';

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const mentorName = await resolveDisplayName(guild, p.mentorId, 'Unknown');
    const partnerName = await resolveDisplayName(guild, p.partnerId, 'Unknown');
    
    const pairStr = `${truncate(mentorName, 12)} - ${truncate(partnerName, 12)}`;
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
  processThreadRegistration,
  startActiveProgram,
  checkRotationAndPhase,
  getLeaderboardPage,
  buildButtons,
  refreshLeaderboard,
  deleteOldLeaderboardMessage,
  buildFinalResults,
  ROTATION_DAYS,
  PHASE_DAYS
};
