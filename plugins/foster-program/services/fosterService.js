/**
 * fosterService.js — Core business logic for Foster Program v2
 * 30-Day Plan: 2 Terms (15d each), 3 Cycles per Term (5d each).
 * Features: Targeted Registration, unique reshuffles, 50/50 points.
 */

const FosterProgram = require('../models/FosterProgram');
const Player = require('../../../bot/database/models/Player');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ThreadAutoArchiveDuration } = require('discord.js');
const configManager = require('../../../bot/utils/configManager');
const { generatePairingImage, generateDualLeaderboardImage } = require('../utils/fosterCanvas');
const aiService = require('../../../bot/utils/aiService');

/* ── Constants ── */
const CYCLE_DAYS = 5;
const TERM_DAYS = 15;
const TOTAL_DAYS = 30;
const REG_WINDOW_MS = 24 * 60 * 60 * 1000;
const VET_ROTATION_MS = 6 * 60 * 60 * 1000;
const VERIFICATION_WINDOW_MS = 12 * 60 * 60 * 1000;

const ROLES = {
  ADEPT: '1484354630140821705',    // Mentors
  NEOPHYTE: '1484348917079478454', // Newbies
  VETERAN: '1486183048247509123'   // Veterans
};

function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getActiveProgram(guildId) {
  return FosterProgram.findOne({ guildId, active: true });
}

async function sendStartConfirmation(message) {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Foster Program v2 | Final Confirmation')
    .setDescription(
      'An administrator has triggered the Foster Program start.\n\n' +
      '**Program Details:**\n' +
      '• **Duration:** 30 Days (2 Terms of 15 Days)\n' +
      '• **Structure:** 3 Cycles per term (5 days each)\n' +
      '• **Verification:** Start/End of every cycle requires stat card screenshots.\n\n' +
      '**Confirm start to initiate Registration Phase?**'
    )
    .setColor('#FFD700')
    .setFooter({ text: 'This action will clear any previous active program data.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('foster_start_confirm').setLabel('Yes, Start Program').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('foster_start_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
  );

  await message.reply({ embeds: [embed], components: [row] });
}

async function initiateRegistration(guild, client) {
  const config = await configManager.getGuildConfig(guild.id);
  const channelId = config?.settings?.fosterChannelId;
  const clanRoleId = config?.settings?.clanMemberRoleId;

  if (!channelId || !clanRoleId) return { success: false, error: 'Foster Channel or Clan Role not configured.' };
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return { success: false, error: 'Foster Channel not found.' };

  await FosterProgram.deleteMany({ guildId: guild.id, active: true });

  const allPlayers = await Player.find({ ign: { $exists: true, $ne: '' } }).sort({ seasonSynergy: -1 });
  
  const mentorTargets = allPlayers.slice(0, 10).map(p => ({ userId: p.discordId, role: 'MENTOR', status: 'invited', invitedAt: getIST() }));
  
  await guild.members.fetch().catch(() => {});
  const monthAgo = getIST(); monthAgo.setDate(monthAgo.getDate() - 30);
  const newbies = guild.members.cache.filter(m => m.roles.cache.has(clanRoleId) && m.joinedAt > monthAgo && !m.user.bot);
  const newbieTargets = [...newbies.keys()].map(uid => ({ userId: uid, role: 'NEOPHYTE', status: 'invited', invitedAt: getIST() }));

  const pool30_60 = allPlayers.slice(29, 60);
  const shuffled = pool30_60.sort(() => 0.5 - Math.random());
  const veteranTargets = shuffled.slice(0, 5).map(p => ({ userId: p.discordId, role: 'VETERAN', status: 'invited', invitedAt: getIST() }));

  const program = await FosterProgram.create({
    guildId: guild.id,
    status: 'REGISTRATION',
    registration: {
      mentorThreadId: (await channel.send('📝 **Registration: Mentors** (Top 10)').then(m => m.startThread({ name: '📝 Mentors', autoArchiveDuration: ThreadAutoArchiveDuration.OneDay }))).id,
      neophyteThreadId: (await channel.send('📝 **Registration: Newbies**').then(m => m.startThread({ name: '📝 Newbies', autoArchiveDuration: ThreadAutoArchiveDuration.OneDay }))).id,
      veteranThreadId: (await channel.send('📝 **Registration: Veterans**').then(m => m.startThread({ name: '📝 Veterans', autoArchiveDuration: ThreadAutoArchiveDuration.OneDay }))).id,
      targets: [...mentorTargets, ...newbieTargets, ...veteranTargets],
      expiresAt: new Date(Date.now() + REG_WINDOW_MS),
      lastPoolRotation: getIST()
    }
  });

  const mThread = await guild.channels.fetch(program.registration.mentorThreadId);
  const nThread = await guild.channels.fetch(program.registration.neophyteThreadId);
  const vThread = await guild.channels.fetch(program.registration.veteranThreadId);

  await mThread.send(`👋 **Mentors:** <@${mentorTargets.map(t => t.userId).join('> <@')}> \nRegister by typing your **IGN** correctly.`);
  await nThread.send(`👋 **Newbies:** <@${newbieTargets.map(t => t.userId).join('> <@')}> \nRegister by typing your **IGN** correctly.`);
  await vThread.send(`👋 **Veterans:** <@${veteranTargets.map(t => t.userId).join('> <@')}> \nRegister by typing your **IGN** correctly.`);

  return { success: true, program };
}

async function processThreadRegistration(message, roleType) {
  const userId = message.author.id;
  const ign = message.content.trim();
  const program = await getActiveProgram(message.guild.id);
  if (!program || program.status !== 'REGISTRATION') return;

  const targetIdx = program.registration.targets.findIndex(t => t.userId === userId && t.role === roleType && t.status === 'invited');
  if (targetIdx === -1) { await message.delete().catch(() => {}); return; }

  // Handle 'not interested'
  if (message.content.toLowerCase().includes('not interested')) {
    program.registration.targets[targetIdx].status = 'declined';
    await program.save();
    await message.react('❌').catch(() => {});
    
    // Replacement logic for mentors
    if (roleType === 'MENTOR') {
      const allPlayers = await Player.find({ ign: { $exists: true, $ne: '' } }).sort({ seasonSynergy: -1 });
      const currentTargetIds = program.registration.targets.map(t => t.userId);
      const nextMentor = allPlayers.find(p => !currentTargetIds.includes(p.discordId));
      if (nextMentor) {
        program.registration.targets.push({ userId: nextMentor.discordId, role: 'MENTOR', status: 'invited', invitedAt: getIST() });
        await program.save();
        const thread = await message.guild.channels.fetch(program.registration.mentorThreadId);
        if (thread) await thread.send(`👋 <@${nextMentor.discordId}>, you have been invited to join the Foster Program as a Mentor! Type your **IGN** to register.`);
      }
    }
    return;
  }

  // Verify IGN
  const player = await Player.findOne({ discordId: userId, ign: { $regex: new RegExp(`^${ign}$`, 'i') } });
  if (!player) { await message.delete().catch(() => {}); return; }

  program.registration.targets[targetIdx].status = 'registered';
  if (roleType === 'MENTOR') program.registration.registeredMentors.push(userId);
  else if (roleType === 'NEOPHYTE') program.registration.registeredNeophytes.push(userId);
  else if (roleType === 'VETERAN') program.registration.registeredVeterans.push(userId);

  await program.save();
  await message.react('✅').catch(() => {});
}

async function handleTermTransition(guild, client, program) {
  // Mentor re-verification (Top 15 check)
  const allPlayers = await Player.find({ ign: { $exists: true, $ne: '' } }).sort({ seasonSynergy: -1 });
  const top15Ids = allPlayers.slice(0, 15).map(p => p.discordId);
  
  let mentors = program.pairs.map(p => p.mentorId);
  let dropped = mentors.filter(id => !top15Ids.includes(id));
  
  for (const id of dropped) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member) await member.send('⚠️ **Foster Program:** You have been removed from the Mentor role for Term 2 because you are no longer in the Top 15 Season Synergy leaderboard.').catch(() => {});
    
    // Remove if possible or mark for replacement
    program.pairs = program.pairs.filter(p => p.mentorId !== id);
  }
  
  program.term = 2;
  program.cycle = 1;
  program.status = 'REGISTRATION'; // Re-open registration if mentors dropped
  await program.save();
  
  if (dropped.length > 0) {
    await initiateRegistration(guild, client);
  } else {
    // Just rotate and continue
    await rotateCycle(guild, client, program);
  }
}

async function finalizeProgram(guild, client, program) {
  program.active = false;
  program.status = 'ENDED';
  await program.save();

  const config = await configManager.getGuildConfig(program.guildId);
  const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
  if (!channel) return;

  // Final Results
  const mentors = []; 
  for (const [id, pts] of program.mentorPoints) {
    const p = await Player.findOne({ discordId: id });
    mentors.push({ ign: p?.ign || 'Unknown', points: pts });
  }
  const partners = []; 
  for (const [id, pts] of program.partnerPoints) {
    const p = await Player.findOne({ discordId: id });
    partners.push({ ign: p?.ign || 'Unknown', points: pts });
  }

  mentors.sort((a,b) => b.points - a.points);
  partners.sort((a,b) => b.points - a.points);

  const top3M = mentors.slice(0, 3).map((m, i) => `${i+1}. **${m.ign}** (${m.points} pts)`).join('\n');
  const top3P = partners.slice(0, 3).map((m, i) => `${i+1}. **${m.ign}** (${m.points} pts)`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🏁 Foster Program v2 | Final Results')
    .setDescription('The 30-day program has concluded! Congratulations to our top rankers.')
    .addFields(
      { name: '🏆 Top Mentors', value: top3M || 'TBD', inline: true },
      { name: '🏆 Top Newbies/Veterans', value: top3P || 'TBD', inline: true }
    )
    .setColor('#FFD700').setTimestamp();

  await channel.send({ embeds: [embed] });
  
  // Cleanup roles
  for (const pair of program.pairs) {
    const mm = await guild.members.fetch(pair.mentorId).catch(() => null);
    const nm = await guild.members.fetch(pair.partnerId).catch(() => null);
    if (mm) await mm.roles.remove(ROLES.ADEPT).catch(() => {});
    if (nm) await nm.roles.remove(ROLES.NEOPHYTE).catch(() => {});
  }
}

async function postOrientation(client, program, guild) {
  const config = await configManager.getGuildConfig(program.guildId);
  const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
  if (!channel) return;

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
  await channel.send({ files: [attachment] });

  const embed = new EmbedBuilder()
    .setTitle('🏆 Foster Program | Cycle Declared')
    .setDescription(`Pairs for T${program.term} C${program.cycle} are declared! Submit initial stat cards.`)
    .setColor('#FFD700').setTimestamp();

  const msg = await channel.send({ content: `<@&${ROLES.ADEPT}> <@&${ROLES.NEOPHYTE}>`, embeds: [embed] });
  const thread = await msg.startThread({ name: `✅ Verification (T${program.term} C${program.cycle})`, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay });
  program.submissionThreadId = thread.id;
  await thread.send('**Submit initial stat card screenshot here within 12 hours!**\nFormat: `initial [points]` + screenshot');
  await program.save();
}

async function checkRotationAndPhase(client) {
  const programs = await FosterProgram.find({ active: true });
  for (const program of programs) {
    try {
      const g = client.guilds.cache.get(program.guildId);
      if (!g) continue;
      const now = getIST();

      if (program.status === 'REGISTRATION' && now.getTime() >= new Date(program.registration.expiresAt).getTime()) {
        await startActiveProgram(g, client, program);
      } else if (program.status === 'PAIRING_VERIFICATION') {
        const waitingForMs = now.getTime() - new Date(program.lastRotation).getTime();
        if (waitingForMs >= VERIFICATION_WINDOW_MS) {
          program.status = 'ACTIVE';
          program.lastRotation = getIST();
          await program.save();
          
          const config = await configManager.getGuildConfig(program.guildId);
          const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
          if (channel) {
            await channel.send('🚀 **Cycle Active!** Initial verification window has closed. The 5-day cycle has begun!');
          }
        }
      } else if (program.status === 'ACTIVE') {
        const dr = (now.getTime() - new Date(program.lastRotation).getTime()) / (24 * 60 * 60 * 1000);
        if (dr >= CYCLE_DAYS) await rotateCycle(g, client, program);
      } else if (program.status === 'VERIFICATION_FINAL') {
        const waitingForMs = now.getTime() - new Date(program.lastRotation).getTime();
        if (waitingForMs >= VERIFICATION_WINDOW_MS) {
           await rotateCycle(g, client, program, true);
        }
      }
    } catch (err) {
      console.error('[FosterProgram] Phase Check Error:', err.message);
    }
  }
}

async function submitSynergyCard(userId, value, type, screenshotUrl, program) {
  const pix = program.pairs.findIndex(p => p.mentorId === userId || p.partnerId === userId);
  if (pix === -1) return { success: false, error: 'Not in an active pair.' };
  const pair = program.pairs[pix]; const pid = pair.mentorId === userId ? pair.partnerId : pair.mentorId;

  const eidx = program.pendingSubmissions.findIndex(s => s.pairIndex === pix && s.userId === pid && s.type === type);
  if (eidx >= 0) {
    const ex = program.pendingSubmissions[eidx];
    if (ex.value !== value) { program.pendingSubmissions.splice(eidx, 1); await program.save(); return { success: false, error: 'Points mismatch!' }; }
    
    if (type === 'initial') {
      program.pairs[pix].initialPoints = value; program.pendingSubmissions.splice(eidx, 1);
      await program.save(); return { success: true, matched: true, type, baseline: value };
    } else {
      const delta = Math.max(0, value - (program.pairs[pix].initialPoints || 0));
      const split = delta / 2;
      program.mentorPoints.set(pair.mentorId, (program.mentorPoints.get(pair.mentorId) || 0) + split);
      program.partnerPoints.set(pair.partnerId, (program.partnerPoints.get(pair.partnerId) || 0) + split);
      program.pairs[pix].points += delta; program.pendingSubmissions.splice(eidx, 1);
      program.submittedThisCycle.push(userId, pid); await program.save();
      return { success: true, matched: true, type, points: delta, split };
    }
  }
  program.pendingSubmissions.push({ pairIndex: pix, userId, value, type, screenshotUrl, timestamp: getIST() });
  await program.save(); return { success: true, matched: false, type, waitingFor: pid };
}

async function refreshLeaderboard(client, program) {
  try {
    const config = await configManager.getGuildConfig(program.guildId);
    const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
    if (!channel) return;
    const guild = await client.guilds.fetch(program.guildId);

    const mentors = []; const partners = [];
    for (const pair of program.pairs) {
      // Mentor
      const mm = await guild.members.fetch(pair.mentorId).catch(() => null);
      const mp = await Player.findOne({ discordId: pair.mentorId });
      const mPts = program.mentorPoints.get(pair.mentorId) || 0;
      mentors.push({ 
        name: mp?.ign || mm?.displayName || 'Unknown', 
        points: mPts, 
        avatarURL: mm?.user.displayAvatarURL({ extension: 'png' }) || '' 
      });

      // Partner
      const pm = await guild.members.fetch(pair.partnerId).catch(() => null);
      const pp = await Player.findOne({ discordId: pair.partnerId });
      const pPts = program.partnerPoints.get(pair.partnerId) || 0;
      partners.push({ 
        name: pp?.ign || pm?.displayName || 'Unknown', 
        points: pPts, 
        avatarURL: pm?.user.displayAvatarURL({ extension: 'png' }) || '' 
      });
    }

    // Sort by points descending
    mentors.sort((a, b) => b.points - a.points);
    partners.sort((a, b) => b.points - a.points);

    const buffer = await generateDualLeaderboardImage({ mentors, newbies: partners }, { term: program.term, cycle: program.cycle });
    const embed = new EmbedBuilder().setTitle('🏆 Foster Rankings').setImage('attachment://foster-lb.png').setColor('#2F3136');
    const attachment = new AttachmentBuilder(buffer, { name: 'foster-lb.png' });
    const payload = { embeds: [embed], files: [attachment] };

    let msg = null;

    if (program.leaderboardMessageId) {
      const oldMsg = await channel.messages.fetch(program.leaderboardMessageId).catch(() => null);
      if (oldMsg) {
        msg = await oldMsg.edit(payload).catch(() => null);
      }
    }

    if (!msg) {
      msg = await channel.send(payload);
      program.leaderboardMessageId = msg.id;
      await program.save();
    }

  } catch (err) {}
}

async function rotateCycle(guild, client, program, force = false) {
  // If not forced, check if final points are collected
  if (!force && program.status !== 'VERIFICATION_FINAL') {
    program.status = 'VERIFICATION_FINAL';
    program.lastRotation = getIST();
    await program.save();
    
    const config = await configManager.getGuildConfig(program.guildId);
    const channel = await client.channels.fetch(config?.settings?.fosterChannelId).catch(() => null);
    if (channel) {
      const msg = await channel.send('🏁 **Cycle End!** Submit your **final** stat card screenshots now to collect points.');
      const thread = await msg.startThread({ name: `🏁 Final Stats (T${program.term} C${program.cycle})`, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay });
      program.submissionThreadId = thread.id;
      await program.save();
    }
    return;
  }

  // Proceed with reshuffle
  if (program.cycle < 3) {
    program.cycle += 1;
    const mentors = program.pairs.map(p => p.mentorId); const partners = program.pairs.map(p => p.partnerId);
    let newPairs = []; let attempts = 0;
    while (attempts < 500) {
      let shuf = shuffleArray([...partners]);
      let ok = true;
      for (let i = 0; i < mentors.length; i++) {
        const isDuplicate = program.previousPairs.some(pp => pp[0] === mentors[i] && pp[1] === shuf[i]);
        if (isDuplicate) { ok = false; break; }
      }
      if (ok) {
        for (let i = 0; i < mentors.length; i++) {
          newPairs.push({ mentorId: mentors[i], partnerId: shuf[i], points: 0, initialPoints: 0 });
          program.previousPairs.push([mentors[i], shuf[i]]);
        }
        break;
      }
      attempts++;
    }

    if (newPairs.length === 0) {
      // Fallback: Just random shuffle if no perfect unique shuffle found after 500 attempts
      let shuf = shuffleArray([...partners]);
      for (let i = 0; i < mentors.length; i++) {
        newPairs.push({ mentorId: mentors[i], partnerId: shuf[i], points: 0, initialPoints: 0 });
        program.previousPairs.push([mentors[i], shuf[i]]);
      }
    }

    program.pairs = newPairs; program.status = 'PAIRING_VERIFICATION'; program.lastRotation = getIST();
    await program.save(); await postOrientation(client, program, guild);
  } else if (program.term === 1) {
    program.term = 2; program.cycle = 1; program.status = 'REGISTRATION'; // Re-verify mentors logic simplified
    await program.save(); await initiateRegistration(guild, client);
  } else {
    program.active = false; program.status = 'ENDED'; await program.save();
  }
}

async function processWildcardEntry(message) {
  const userId = message.author.id;
  const ign = message.content.trim();
  const program = await getActiveProgram(message.guild.id);
  if (!program || program.status !== 'REGISTRATION') return;

  // 1. Check if "not interested"
  const isDeclined = program.registration.targets.some(t => t.userId === userId && t.status === 'declined');
  if (isDeclined) return;

  // 2. Check if already registered
  const isRegistered = program.registration.registeredMentors.includes(userId) || 
                       program.registration.registeredNeophytes.includes(userId) || 
                       program.registration.registeredVeterans.includes(userId);
  if (isRegistered) return;

  // 3. Verify IGN
  const player = await Player.findOne({ discordId: userId, ign: { $regex: new RegExp(`^${ign}$`, 'i') } });
  if (!player) return;

  // 4. Add to Neophytes
  program.registration.registeredNeophytes.push(userId);
  await program.save();
  await message.react('✅').catch(() => {});

  // 5. Trigger pairings if we reached 10 partners total
  const partnersCount = program.registration.registeredNeophytes.length + program.registration.registeredVeterans.length;
  if (partnersCount >= 10 || partnersCount >= program.registration.registeredMentors.length) {
    await startActiveProgram(message.guild, message.client, program);
  }
}

async function startActiveProgram(guild, client, program) {
  const mentors = program.registration.registeredMentors.slice(0, 10);
  const partners = [...program.registration.registeredNeophytes, ...program.registration.registeredVeterans];
  const pairCount = Math.min(mentors.length, partners.length);
  
  const finalMentors = mentors.slice(0, pairCount);
  const finalPartners = partners.slice(0, pairCount);
  
  const pairs = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push({ mentorId: finalMentors[i], partnerId: finalPartners[i], points: 0, initialPoints: 0 });
    program.previousPairs.push([finalMentors[i], finalPartners[i]]);
  }

  program.pairs = pairs;
  program.status = 'PAIRING_VERIFICATION';
  program.lastRotation = getIST();
  await program.save();

  // Role Assignment
  for (const pair of pairs) {
    const mm = await guild.members.fetch(pair.mentorId).catch(() => null);
    const nm = await guild.members.fetch(pair.partnerId).catch(() => null);
    if (mm) await mm.roles.add(ROLES.ADEPT).catch(() => {});
    
    if (nm) {
      // Check if they were registered as Veteran or Neophyte
      const isVet = program.registration.registeredVeterans.includes(pair.partnerId);
      await nm.roles.add(isVet ? ROLES.VETERAN : ROLES.NEOPHYTE).catch(() => {});
    }
  }

  await postOrientation(client, program, guild);
}

module.exports = { 
  getActiveProgram, sendStartConfirmation, initiateRegistration, 
  processThreadRegistration, processWildcardEntry, 
  rotateCycle, checkRotationAndPhase, submitSynergyCard, refreshLeaderboard, 
  postOrientation, ROLES 
};
