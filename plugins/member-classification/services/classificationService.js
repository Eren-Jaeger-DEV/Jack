/**
 * classificationService.js — Core logic for member classification
 *
 * Handles role assignment, Newbie timer persistence, and expired timer cleanup.
 */

const NewbieTimer = require('../models/NewbieTimer');
const AwaitingClassification = require('../models/AwaitingClassification');

/* ── Constants ── */
const CLASSIFICATION_CHANNEL_ID = '1341978656096129065';
const CLAN_MEMBER_ROLE_ID       = '1477856665817714699';
const NEWBIE_ROLE_ID            = '1484348917079478454';
const DISCORD_MEMBER_ROLE_ID    = '1486182016415301763';
const OWNER_ROLE_ID             = '1407978936276746251';
const MANAGER_ROLE_ID           = '1477874246972604588';
const NEWBIE_DURATION_DAYS      = 14;

/**
 * Classify a member as a Clan Member.
 * Assigns Clan Member + Newbie roles and stores a persistent timer.
 */
async function classifyAsClanMember(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { success: false, error: 'Member not found in the server.' };

  // Assign Clan Member role
  const clanRole = guild.roles.cache.get(CLAN_MEMBER_ROLE_ID);
  if (clanRole && !member.roles.cache.has(CLAN_MEMBER_ROLE_ID)) {
    await member.roles.add(clanRole).catch(err => {
      console.error(`[MemberClassification] Failed to add clan role to ${member.user.tag}:`, err.message);
    });
  }

  // Assign Newbie role
  const newbieRole = guild.roles.cache.get(NEWBIE_ROLE_ID);
  if (newbieRole && !member.roles.cache.has(NEWBIE_ROLE_ID)) {
    await member.roles.add(newbieRole).catch(err => {
      console.error(`[MemberClassification] Failed to add newbie role to ${member.user.tag}:`, err.message);
    });
  }

  // Store persistent timer (14 days)
  await scheduleNewbieRemoval(guild.id, userId);
  
  // Cleanup awaiting list
  await removeAwaitingClassification(guild.id, userId);

  return { success: true };
}

/**
 * Classify a member as a Discord Member.
 * Assigns Discord Member role.
 */
async function classifyAsDiscordMember(guild, userId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return { success: false, error: 'Member not found in the server.' };
  
    const discordRole = guild.roles.cache.get(DISCORD_MEMBER_ROLE_ID);
    if (discordRole && !member.roles.cache.has(DISCORD_MEMBER_ROLE_ID)) {
      await member.roles.add(discordRole).catch(err => {
        console.error(`[MemberClassification] Failed to add discord role to ${member.user.tag}:`, err.message);
      });
    }

    // Cleanup awaiting list
    await removeAwaitingClassification(guild.id, userId);
  
    return { success: true };
}

/**
 * Store a Newbie timer in the database.
 */
async function scheduleNewbieRemoval(guildId, userId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + NEWBIE_DURATION_DAYS * 24 * 60 * 60 * 1000);

  try {
    await NewbieTimer.findOneAndUpdate(
      { guildId, userId },
      { guildId, userId, assignedAt: now, expiresAt },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`[MemberClassification] Newbie timer set for ${userId}, expires ${expiresAt.toISOString()}`);
  } catch (err) {
    console.error(`[MemberClassification] Failed to store newbie timer for ${userId}:`, err.message);
  }
}

/**
 * Tracking for reminders.
 */
async function addAwaitingClassification(guildId, userId, messageId) {
    try {
        await AwaitingClassification.findOneAndUpdate(
            { guildId, userId },
            { guildId, userId, messageId, joinedAt: new Date(), lastRemindedAt: null },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (err) {
        console.error(`[MemberClassification] Failed to track unclassified user ${userId}:`, err.message);
    }
}

async function removeAwaitingClassification(guildId, userId) {
    try {
        await AwaitingClassification.deleteOne({ guildId, userId });
    } catch (err) {
        console.error(`[MemberClassification] Failed to cleanup unclassified user ${userId}:`, err.message);
    }
}

/**
 * Send reminders every 30 mins for unclassified members.
 */
async function sendClassificationReminders(client) {
    try {
        const threshold = new Date(Date.now() - 30 * 60 * 1000);
        const unclassified = await AwaitingClassification.find({
            $or: [
                { lastRemindedAt: null, joinedAt: { $lte: threshold } },
                { lastRemindedAt: { $lte: threshold } }
            ]
        });

        if (unclassified.length === 0) return;

        console.log(`[MemberClassification] Sending reminders for ${unclassified.length} unclassified members.`);

        for (const entry of unclassified) {
            const guild = client.guilds.cache.get(entry.guildId);
            if (!guild) continue;

            const channel = guild.channels.cache.get(CLASSIFICATION_CHANNEL_ID);
            if (!channel) continue;

            // Ping owner and manager
            const messageContent = `🚨 **Classification Reminder**\n` +
                                 `<@${entry.userId}> has joined but has not been classified yet.\n` +
                                 `Attention: <@&${OWNER_ROLE_ID}> <@&${MANAGER_ROLE_ID}>\n` +
                                 `[Go to message](https://discord.com/channels/${entry.guildId}/${CLASSIFICATION_CHANNEL_ID}/${entry.messageId})`;

            await channel.send(messageContent).catch(() => {});

            entry.lastRemindedAt = new Date();
            await entry.save();
        }
    } catch (err) {
        console.error('[MemberClassification] Error sending reminders:', err.message);
    }
}

/**
 * Check for expired Newbie timers and remove the role.
 * Called on startup and periodically.
 */
async function checkExpiredNewbies(client) {
  try {
    const now = new Date();
    const expired = await NewbieTimer.find({ expiresAt: { $lte: now } });

    if (expired.length === 0) return;

    console.log(`[MemberClassification] Found ${expired.length} expired newbie timer(s).`);

    for (const timer of expired) {
      try {
        const guild = client.guilds.cache.get(timer.guildId);
        if (!guild) {
          await NewbieTimer.deleteOne({ _id: timer._id });
          continue;
        }

        const member = await guild.members.fetch(timer.userId).catch(() => null);
        if (!member) {
          // User left the server — clean up
          await NewbieTimer.deleteOne({ _id: timer._id });
          continue;
        }

        const newbieRole = guild.roles.cache.get(NEWBIE_ROLE_ID);
        if (newbieRole && member.roles.cache.has(NEWBIE_ROLE_ID)) {
          await member.roles.remove(newbieRole).catch(err => {
            console.error(`[MemberClassification] Failed to remove newbie role from ${member.user.tag}:`, err.message);
          });
          console.log(`[MemberClassification] Removed Newbie role from ${member.user.tag} (expired).`);
        }

        // Clean up DB entry
        await NewbieTimer.deleteOne({ _id: timer._id });

      } catch (err) {
        console.error(`[MemberClassification] Error processing timer for ${timer.userId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[MemberClassification] Error checking expired newbies:', err.message);
  }
}

module.exports = {
  classifyAsClanMember,
  classifyAsDiscordMember,
  scheduleNewbieRemoval,
  addAwaitingClassification,
  removeAwaitingClassification,
  sendClassificationReminders,
  checkExpiredNewbies,
  CLASSIFICATION_CHANNEL_ID,
  CLAN_MEMBER_ROLE_ID,
  NEWBIE_ROLE_ID,
  NEWBIE_DURATION_DAYS
};
