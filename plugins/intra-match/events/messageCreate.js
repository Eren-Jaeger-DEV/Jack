/**
 * messageCreate.js — Intra-Match Event Handler
 *
 * Listens for messages and routes them through four detection paths:
 *
 *  1. REGISTRATION TRIGGER — Admin message in announce channel with keywords
 *  2. TIME DETECTION      — Admin message in active thread with a date
 *  3. IGN REGISTRATION    — User message in active thread (IGN validation)
 *  4. WINNER DETECTION    — Admin message in announce channel with 🏆/winner + mentions
 */

const { PermissionFlagsBits, ChannelType } = require('discord.js');
const registrationManager = require('../services/registrationManager');
const timeParser = require('../services/timeParser');
const roleManager = require('../services/roleManager');
const configManager = require('../../../bot/utils/configManager');

/* ── Keyword matchers ── */
const REG_KEYWORDS = ['registration open', 'register now', 'intra registration'];
const WINNER_KEYWORDS = ['🏆', 'winner'];

/**
 * Check if member has admin-level permissions.
 */
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) ||
         member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  name: 'messageCreate',

  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const channelId = message.channel.id;
    const content = message.content.toLowerCase();
    const member = message.member;

    /* ═══════════════════════════════════════════════
     *  PATH 1 — REGISTRATION TRIGGER (Announce Channel)
     * ═══════════════════════════════════════════════ */
    const config = await configManager.getGuildConfig(message.guild.id);
    const announceChannelId = config?.settings?.intraAnnounceChannelId;

    if (channelId === announceChannelId && isAdmin(member)) {

      /* ── 1A. Winner Detection ── */
      if (WINNER_KEYWORDS.some(kw => content.includes(kw)) && message.mentions.members.size > 0) {
        return handleWinner(message);
      }

      /* ── 1B. Registration Trigger ── */
      if (REG_KEYWORDS.some(kw => content.includes(kw))) {
        return handleRegistrationTrigger(message);
      }
    }

    /* ═══════════════════════════════════════════════
     *  PATH 2 & 3 — Messages Inside Active Registration Thread
     * ═══════════════════════════════════════════════ */
    if (message.channel.type === ChannelType.PublicThread || message.channel.type === ChannelType.PrivateThread) {
      const reg = await registrationManager.getActive(message.guild.id);
      if (!reg || reg.threadId !== channelId) return;

      /* ── 2. Time Detection (Admin only) ── */
      if (isAdmin(member)) {
        return handleTimeMessage(message, reg);
      }

      /* ── 3. IGN Registration (Regular users) ── */
      return handleIGNRegistration(message, reg);
    }
  }
};

/* ═══════════════════════════════════════════════════════
 *  HANDLER: Registration Trigger
 * ═══════════════════════════════════════════════════════ */
async function handleRegistrationTrigger(message) {
  try {
    // Check if an active registration already exists
    const existing = await registrationManager.getActive(message.guild.id);
    if (existing) {
      return message.reply('⚠️ There is already an active intra registration. Close or end it before starting a new one.');
    }

    // Create the registration thread
    const thread = await message.startThread({
      name: '🎮 Intra Registration',
      autoArchiveDuration: 1440 // 24 hours
    });

    // Create registration state in DB
    await registrationManager.createRegistration(
      message.guild.id,
      thread.id,
      message.id
    );

    // Send welcome message in thread
    await thread.send(
      '📋 **Intra Registration Started!**\n\n' +
      '• **Players**: Send your **IGN** (In-Game Name) to register.\n' +
      '• **Admins**: Send the closing date (e.g. `Closes on Tuesday` or `Ends 12 June 2025`).\n\n' +
      '⏳ Waiting for an admin to set the closing time...'
    );

    await message.react('✅');

    // Schedule a reminder if endTime is not set after 2 minutes
    setTimeout(async () => {
      try {
        const refreshed = await registrationManager.getActive(message.guild.id);
        if (refreshed && refreshed.threadId === thread.id && !refreshed.endTime) {
          await thread.send('⏰ **Reminder:** No closing time has been set yet. An admin should send a date like `Closes on Friday` or `Ends 25 March`.');
        }
      } catch (err) {
        // Thread may have been deleted, ignore
      }
    }, 2 * 60 * 1000);

  } catch (err) {
    console.error('[IntraMatch] Registration trigger error:', err);
    await message.reply('❌ Failed to start registration. Check bot permissions.').catch(() => {});
  }
}

/* ═══════════════════════════════════════════════════════
 *  HANDLER: Time Detection (Admin message in thread)
 * ═══════════════════════════════════════════════════════ */
async function handleTimeMessage(message, reg) {
  try {
    const parsed = timeParser.parse(message.content);

    if (!parsed) {
      // Not a date message — admins can still chat freely, only react if it looks like an attempt
      const looksLikeDate = /\b(closes?|ends?|deadline|due)\b/i.test(message.content);
      if (looksLikeDate) {
        await message.react('❌');
        await message.reply(
          '❌ Could not parse that date. Try one of these formats:\n' +
          '• `Closes on Tuesday`\n' +
          '• `Ends 12 June 2025`\n' +
          '• `Closes on 25th March`'
        );
      }
      return;
    }

    // Validate the date is in the future
    if (parsed <= new Date()) {
      await message.react('❌');
      return message.reply('❌ That date is in the past. Please provide a future date.');
    }

    // Save the end time
    await registrationManager.setEndTime(reg._id, parsed);

    await message.react('✅');
    await message.reply(
      `✅ Registration will **auto-close** on **${parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}** at end of day.`
    );

  } catch (err) {
    console.error('[IntraMatch] Time parse error:', err);
  }
}

/* ═══════════════════════════════════════════════════════
 *  HANDLER: IGN Registration (User message in thread)
 * ═══════════════════════════════════════════════════════ */
async function handleIGNRegistration(message, reg) {
  try {
    const ign = message.content.trim();

    // Ignore messages that are clearly not IGNs (too long, contains spaces suggesting chat)
    if (ign.length > 30 || ign.split(/\s+/).length > 3) return;

    // Check if user has CLAN_ROLE_ID
    const config = await configManager.getGuildConfig(message.guild.id);
    const clanRoleId = config?.settings?.clanMemberRoleId;

    if (clanRoleId && !message.member.roles.cache.has(clanRoleId)) {
      await message.react('❌');
      return message.reply('❌ You must be a clan member to register.');
    }

    // Attempt to register
    const result = await registrationManager.addParticipant(reg._id, message.author.id, ign);

    if (result.success) {
      await message.react('✅');

      // Assign participate role
      const participateRoleId = config?.settings?.intraParticipateRoleId;
      if (participateRoleId) {
        await roleManager.assignRole(message.guild, message.author.id, participateRoleId);
      }

      // Send a subtle confirmation (count)
      const updated = await registrationManager.getActive(message.guild.id);
      const count = updated ? updated.participants.length : '?';
      await message.reply(`✅ **${ign}** registered! (${count} participants so far)`);

    } else {
      await message.react('❌');
      await message.reply(`❌ ${result.error}`);
    }

  } catch (err) {
    console.error('[IntraMatch] IGN registration error:', err);
    await message.reply('❌ Something went wrong during registration.').catch(() => {});
  }
}

/* ═══════════════════════════════════════════════════════
 *  HANDLER: Winner Detection (Announce channel)
 * ═══════════════════════════════════════════════════════ */
async function handleWinner(message) {
  try {
    const config = await configManager.getGuildConfig(message.guild.id);
    const winnerRoleId = config?.settings?.intraWinnerRoleId;
    const participateRoleId = config?.settings?.intraParticipateRoleId;
    const reg = await registrationManager.getActive(message.guild.id);

    // 1. Remove WINNER_ROLE_ID from all members who currently have it
    if (winnerRoleId) {
      await roleManager.removeRoleFromAll(message.guild, winnerRoleId);
    }

    // 2. Assign WINNER_ROLE_ID to all mentioned users
    const mentioned = message.mentions.members;
    const winners = [];

    for (const [, member] of mentioned) {
      const assigned = winnerRoleId ? await roleManager.assignRole(message.guild, member.id, winnerRoleId) : false;
      if (assigned) winners.push(member.user.tag);
    }

    // 3. Remove PARTICIPATE_ROLE_ID from all members
    if (participateRoleId) {
      await roleManager.removeRoleFromAll(message.guild, participateRoleId);
    }

    // 4. Close the active registration if one exists
    if (reg) {
      await registrationManager.closeRegistration(reg._id);
    }

    // 5. Send confirmation
    await message.reply(
      `🏆 **Winners announced!**\n\n` +
      `${winners.length > 0 ? winners.map(w => `• ${w}`).join('\n') : 'No winners assigned.'}\n\n` +
      `Participate role cleared. Registration closed.`
    );

  } catch (err) {
    console.error('[IntraMatch] Winner detection error:', err);
    await message.reply('❌ Failed to process winners. Check bot permissions.').catch(() => {});
  }
}
