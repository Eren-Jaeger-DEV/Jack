/**
 * fosterService.js — Core business logic for the Foster Program
 * 30-Day Overhaul Plan: 2 Terms (15d each), 3 Shuffles per Term (5d each).
 * Features: Dual-Validation Stat Cards (Final - Initial) & 50/50 Point Splitting.
 */

const FosterProgram = require('../models/FosterProgram');
const Player = require('../../../bot/database/models/Player');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ThreadAutoArchiveDuration } = require('discord.js');
const { resolveDisplayName } = require('../../../bot/utils/nameResolver');
const configManager = require('../../../bot/utils/configManager');
const { generatePairingImage, generateDualLeaderboardImage } = require('../utils/fosterCanvas');
const aiService = require('../../../bot/utils/aiService');

/* ── Constants ── */
const ROTATION_DAYS       = 5;
const TERM_DAYS           = 15;
const PLAN_TOTAL_DAYS     = 30;
const SUBMISSION_WINDOW_MS = 15 * 60 * 1000;
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const POOL_EXPANSION_MS      = 6 * 60 * 60 * 1000;
const MENTOR_COUNT        = 15;
const MENTOR_MIN_DAYS     = 30;

/* ── Role Configuration ── */
const ROLES = {
  ADEPT:    '1484354630140821705', // Mentors
  NEOPHYTE: '1484348917079478454', // Newbies
  NEWCOMER: '1488835349571702935'  // Input role
};

function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

async function getActiveProgram(guildId) {
  return FosterProgram.findOne({ guildId, active: true });
}

async function startProgram(guild, client) {
  const config = await configManager.getGuildConfig(guild.id);
  const fosterChannelId = config?.settings?.fosterChannelId;
  const clanMemberRoleId = config?.settings?.clanMemberRoleId;
  if (!fosterChannelId || !clanMemberRoleId) return { success: false, error: 'Foster Channel or Clan Role not configured.' };
  await FosterProgram.deleteMany({ guildId: guild.id, active: true });
  await guild.members.fetch().catch(() => {});
  const clanMembers = guild.members.cache.filter(m => m.roles.cache.has(clanMemberRoleId) && !m.user.bot);
  const players = await Player.find({ discordId: { $in: [...clanMembers.keys()] }, ign: { $exists: true, $ne: '' } }).sort({ lastSeasonSynergy: -1 });
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - MENTOR_MIN_DAYS);
  const mentorCandidates = players.filter(p => p.clanJoinDate && p.clanJoinDate <= thirtyDaysAgo).slice(0, MENTOR_COUNT);
  const program = await FosterProgram.create({
    guildId: guild.id, active: true, status: 'REGISTRATION',
    registration: { mentorPoolSize: 15, lastPoolExpansion: new Date(), expiresAt: new Date(Date.now() + REGISTRATION_WINDOW_MS) }
  });
  return { success: true, program };
}

async function startActiveProgram(guild, client, program) {
  const mentors = program.registration.registeredMentors;
  const partners = [...program.registration.registeredNeophytes, ...program.registration.registeredVeterans];
  const pairCount = Math.min(mentors.length, partners.length);
  const finalMentors = mentors.slice(0, pairCount);
  const finalPartners = partners.slice(0, pairCount);
  const pairs = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push({ mentorId: finalMentors[i], partnerId: finalPartners[i], points: 0, initialPoints: 0 });
  }
  program.status = 'ACTIVE'; program.term = 1; program.cycle = 1; program.pairs = pairs;
  program.startedAt = getIST(); program.lastRotation = getIST();
  await program.save();
  for (const pair of pairs) {
    const mm = await guild.members.fetch(pair.mentorId).catch(() => null);
    const nm = await guild.members.fetch(pair.partnerId).catch(() => null);
    if (mm) await mm.roles.add(ROLES.ADEPT).catch(() => {});
    if (nm) { await nm.roles.add(ROLES.NEOPHYTE).catch(() => {}); await nm.roles.remove(ROLES.NEWCOMER).catch(() => {}); }
  }
  await postOrientation(client, program);
  await refreshLeaderboard(client, program);
}

async function endProgram(guild, client) {
  const program = await getActiveProgram(guild.id); if (!program) return { success: false, error: 'No active foster program.' };
  const pids = new Set(); program.pairs.forEach(p => { pids.add(p.mentorId); pids.add(p.partnerId); });
  await guild.members.fetch().catch(() => {});
  const rolesToRemove = [ROLES.ADEPT, ROLES.NEOPHYTE, ROLES.NEWCOMER];
  for (const uid of pids) {
    const member = guild.members.cache.get(uid);
    if (member) rolesToRemove.forEach(rid => { if (member.roles.cache.has(rid)) member.roles.remove(rid).catch(() => {}); });
  }
  await deleteOldLeaderboardMessage(client, program);
  program.active = false; program.status = 'ENDED'; await program.save();
  return { success: true, program };
}

function rotatePairs(program) {
  if (program.pairs.length < 2) return;
  const partners = program.pairs.map(p => p.partnerId);
  partners.unshift(partners.pop());
  for (let i = 0; i < program.pairs.length; i++) {
    program.pairs[i].partnerId = partners[i];
    program.pairs[i].initialPoints = 0;
    program.pairs[i].points = 0; // reset cycle points
  }
  program.cycle += 1; if (program.cycle > 3) program.cycle = 1;
  program.rotationIndex += 1; program.lastRotation = getIST();
  program.submittedThisCycle = [];
  program.pendingSubmissions = []; // Bug 7 fix: clear stale submissions on rotation
}

async function advancePhase(guild, client, program) {
  const config = await configManager.getGuildConfig(guild.id); if (!config?.settings?.clanMemberRoleId) return;
  await guild.members.fetch().catch(() => {});
  const clanMembers = guild.members.cache.filter(m => m.roles.cache.has(config.settings.clanMemberRoleId) && !m.user.bot);
  const players = await Player.find({ discordId: { $in: [...clanMembers.keys()] }, ign: { $exists: true, $ne: '' } }).sort({ lastSeasonSynergy: -1 });
  const mc = Math.min(MENTOR_COUNT, Math.floor(players.length / 2));
  const mp = players.slice(0, mc); const mids = new Set(mp.map(p => p.discordId));
  const rp = players.filter(p => !mids.has(p.discordId)).slice(0, mids.size);
  const newPairs = [];
  for (let i = 0; i < mp.length; i++) { newPairs.push({ mentorId: mp[i].discordId, partnerId: rp[i].discordId, points: 0, initialPoints: 0 }); }
  program.term = 2; program.cycle = 1; program.phase = 2; program.rotationIndex = 0;
  program.lastRotation = getIST(); program.pairs = newPairs;
  program.pendingSubmissions = []; program.submittedThisCycle = [];
  await program.save();
  await postOrientation(client, program);
  await refreshLeaderboard(client, program);
}

/**
 * PHASE 1: Post the Pairing orientation board and create the submission thread.
 */
async function postOrientation(client, program) {
  try {
    const config = await configManager.getGuildConfig(program.guildId);
    const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
    if (!channel) return;
    const guild = await client.guilds.fetch(program.guildId).catch(() => null);

    const pairingData = [];
    for (const pair of program.pairs) {
        const mm = await guild.members.fetch(pair.mentorId).catch(() => null);
        const nm = await guild.members.fetch(pair.partnerId).catch(() => null);
        const mp = await Player.findOne({ discordId: pair.mentorId });
        const np = await Player.findOne({ discordId: pair.partnerId });
        pairingData.push({
            mentor: { name: mp?.ign || mm?.displayName || 'Unknown', avatarURL: mm?.user.displayAvatarURL({ extension: 'png' }) || '' },
            newbie: { name: np?.ign || nm?.displayName || 'Unknown', avatarURL: nm?.user.displayAvatarURL({ extension: 'png' }) || '' }
        });
    }

    const buffer = await generatePairingImage(pairingData, { term: program.term, cycle: program.cycle });
    const attachment = new AttachmentBuilder(buffer, { name: 'foster-pairings.png' });

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Foster Program | Pairing Board')
        .setDescription(`New pairs have been established. Coordinate with your counterparts to earn points.`)
        .setImage('attachment://foster-pairings.png')
        .setColor('#FFD700').setTimestamp();

    const msg = await channel.send({ content: `<@&${ROLES.ADEPT}> <@&${ROLES.NEOPHYTE}>`, embeds: [embed], files: [attachment] });
    
    // Create Thread
    const thread = await msg.startThread({ name: `📌 Stat Cards (T${program.term} C${program.cycle})`, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay });
    program.submissionThreadId = thread.id;
    await thread.send(`👋 **Foster Participants!** Use this thread to submit your stats cards.\n\n` +
      `**How to Submit:**\n` +
      `1️⃣ Use the command: \`/fs submit\`\n` +
      `2️⃣ Choose **Type**: \`Initial\` (Day 1) or \`Final\` (Day 5).\n` +
      `3️⃣ Enter **Points**: The "Team-up points earned" value from your card.\n` +
      `4️⃣ Attach **Screenshot**: Screenshot of your "All Data" stats card.\n\n` +
      `**Reference Image (What to send):** https://cdn.discordapp.com/attachments/1341978656096129065/1489205554621714482/Screenshot_20260402-153333.Battlegrounds_India.png\n\n` +
      `Points are calculated as \`Final - Initial\`. Both partners must submit the same value and screenshot!`);
    await program.save();
    return msg;
  } catch (err) { console.error('[FosterProgram] postOrientation error:', err); }
}

/**
 * PHASE 2: Post/Refresh the Global Rankings leaderboard.
 */
async function refreshLeaderboard(client, program) {
  try {
    const config = await configManager.getGuildConfig(program.guildId);
    const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
    if (!channel) return;
    const guild = await client.guilds.fetch(program.guildId).catch(() => null);

    // Bug 4 fix: always re-fetch from DB so we use saved data, not a stale in-memory copy
    const fresh = await FosterProgram.findById(program._id) || program;

    const mentorList = []; const newbieList = [];
    for (const [id, points] of fresh.mentorPoints) {
        const mm = await guild.members.fetch(id).catch(() => null);
        const mp = await Player.findOne({ discordId: id });
        mentorList.push({ name: mp?.ign || mm?.displayName || 'Unknown', points, avatarURL: mm?.user.displayAvatarURL({ extension: 'png' }) || '' });
    }
    for (const [id, points] of fresh.newbiePoints) {
        const nm = await guild.members.fetch(id).catch(() => null);
        const np = await Player.findOne({ discordId: id });
        newbieList.push({ name: np?.ign || nm?.displayName || 'Unknown', points, avatarURL: nm?.user.displayAvatarURL({ extension: 'png' }) || '' });
    }
    mentorList.sort((a,b) => b.points-a.points); newbieList.sort((a,b) => b.points-a.points);

    const buffer = await generateDualLeaderboardImage({ mentors: mentorList, newbies: newbieList }, { term: fresh.term, cycle: fresh.cycle });
    const attachment = new AttachmentBuilder(buffer, { name: 'foster-rankings.png' });

    const embed = new EmbedBuilder()
        .setTitle('🏆 Foster Program | Global Rankings')
        .setDescription(`Individual rankings based on 50/50 point splits. Keep up the momentum!`)
        .setImage('attachment://foster-rankings.png')
        .setColor('#2F3136').setTimestamp();

    await deleteOldLeaderboardMessage(client, fresh);
    const msg = await channel.send({ embeds: [embed], files: [attachment] });
    fresh.leaderboardMessageId = msg.id;
    await fresh.save();
    return msg;
  } catch (err) { console.error('[FosterProgram] refreshLeaderboard error:', err); }
}

async function submitSynergyCard(userId, value, type, screenshotUrl, program) {
  // 1. AI Screenshot Verification — null = unreadable, 0 = genuinely no points earned
  const extracted = await aiService.extractSynergyPoints(screenshotUrl);

  if (extracted === null || extracted === undefined) {
    return { success: false, error: "AI could not read the screenshot. Make sure the **'All Data'** stats card is fully visible with the **'Team-up points earned'** row clearly readable." };
  }

  if (extracted !== value) {
    return {
      success: false,
      error: `Points mismatch! You entered **${value}** but Jack read **${extracted}** from your screenshot.\n\nPlease double-check the **"Team-up points earned"** value and run \`/fs submit\` again.`
    };
  }

  // 2. Identify pair and partner
  const pix = program.pairs.findIndex(p => p.mentorId === userId || p.partnerId === userId);
  if (pix === -1) return { success: false, error: 'You are not in an active pair.' };
  const pair = program.pairs[pix]; const pid = pair.mentorId === userId ? pair.partnerId : pair.mentorId;
  const eidx = program.pendingSubmissions.findIndex(s => s.pairIndex === pix && s.userId === pid && s.type === type);
  if (eidx >= 0) {
    const ex = program.pendingSubmissions[eidx];
    if (Date.now() - new Date(ex.timestamp).getTime() > SUBMISSION_WINDOW_MS) {
        program.pendingSubmissions.splice(eidx, 1); await program.save();
        return { success: false, error: 'Partner submission expired. Resubmit together.' };
    }
    if (ex.value !== value) {
        program.pendingSubmissions.splice(eidx, 1); await program.save();
        return { success: false, error: 'Points mismatch!' };
    }
    if (type === 'initial') {
        program.pairs[pix].initialPoints = value; program.pendingSubmissions.splice(eidx, 1);
        await program.save(); return { success: true, matched: true, type, baseline: value };
    } else {
        const delta = Math.max(0, value - (program.pairs[pix].initialPoints || 0));
        const split = delta / 2;
        program.mentorPoints.set(pair.mentorId, (program.mentorPoints.get(pair.mentorId) || 0) + split);
        program.newbiePoints.set(pair.partnerId, (program.newbiePoints.get(pair.partnerId) || 0) + split);
        program.pairs[pix].points += delta;
        program.pendingSubmissions.splice(eidx, 1); program.submittedThisCycle.push(userId, pid);
        await program.save(); return { success: true, matched: true, type, points: delta, split };
    }
  }
  program.pendingSubmissions.push({ pairIndex: pix, userId, value, type, screenshotUrl, timestamp: new Date() });
  await program.save(); return { success: true, matched: false, type, waitingFor: pid };
}

async function checkRotationAndPhase(client) {
  const programs = await FosterProgram.find({ active: true });
  for (const program of programs) {
    try {
      const g = client.guilds.cache.get(program.guildId); if (!g) continue;
      const now = getIST(); const st = new Date(program.startedAt).getTime(); const rt = new Date(program.lastRotation).getTime();
      const ds = Math.floor((now.getTime() - st) / (24 * 60 * 60 * 1000));
      const dr = Math.floor((now.getTime() - rt) / (24 * 60 * 60 * 1000));
      if (ds >= PLAN_TOTAL_DAYS) { await endProgram(g, client); continue; }
      if (ds >= TERM_DAYS && program.term === 1) { await advancePhase(g, client, program); continue; }
      if (dr === 4 && now.getHours() === 23) {
          const t = await g.channels.fetch(program.submissionThreadId).catch(() => null);
          if (t && !t.locked) await t.setLocked(true).catch(() => {});
      }
      if (dr >= ROTATION_DAYS) { rotatePairs(program); await program.save(); await postOrientation(client, program); await refreshLeaderboard(client, program); }
    } catch (err) {}
  }
}

async function deleteOldLeaderboardMessage(client, program) {
  try {
    const config = await configManager.getGuildConfig(program.guildId);
    const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
    if (!channel || !program.leaderboardMessageId) return;
    const old = await channel.messages.fetch(program.leaderboardMessageId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  } catch (err) {}
}

module.exports = {
  getActiveProgram, startProgram, endProgram, rotatePairs, advancePhase, 
  checkRotationAndPhase, refreshLeaderboard, deleteOldLeaderboardMessage, 
  startActiveProgram, submitSynergyCard, postOrientation, ROLES
};
