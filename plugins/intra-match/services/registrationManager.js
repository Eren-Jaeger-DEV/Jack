/**
 * registrationManager.js — Core state management for intra-match registrations
 *
 * All database operations for IntraRegistration go through here.
 */

const IntraRegistration = require('../models/IntraRegistration');
const Player = require('../../../bot/database/models/Player');

/**
 * Get the currently active registration for a guild.
 * @param {string} guildId
 * @returns {Document|null}
 */
async function getActive(guildId) {
  return IntraRegistration.findOne({ guildId, active: true });
}

/**
 * Create a new registration session.
 * @param {string} guildId
 * @param {string} threadId
 * @param {string} announceMessageId
 * @returns {Document}
 */
async function createRegistration(guildId, threadId, announceMessageId) {
  return IntraRegistration.create({
    guildId,
    threadId,
    announceMessageId,
    active: true,
    participants: []
  });
}

/**
 * Set the closing time for a registration.
 * @param {string} regId — Document _id
 * @param {Date} date
 */
async function setEndTime(regId, date) {
  return IntraRegistration.findByIdAndUpdate(regId, { endTime: date }, { returnDocument: 'after' });
}

/**
 * Validate an IGN and add the user as a participant.
 *
 * Checks:
 *  1. Player exists in the Player collection with matching IGN
 *  2. The Player record belongs to the requesting Discord user
 *  3. User has the clan role (checked by the caller)
 *  4. User is not already registered
 *
 * @param {string} regId
 * @param {string} discordId
 * @param {string} ign
 * @returns {{ success: boolean, error?: string }}
 */
async function addParticipant(regId, discordId, ign) {
  const reg = await IntraRegistration.findById(regId);
  if (!reg || !reg.active) {
    return { success: false, error: 'No active registration found.' };
  }

  // Check if user is already registered
  const alreadyRegistered = reg.participants.some(p => p.discordId === discordId);
  if (alreadyRegistered) {
    return { success: false, error: 'You are already registered for this intra match.' };
  }

  // Find the Player record with matching IGN (case-insensitive)
  const player = await Player.findOne({
    ign: { $regex: new RegExp(`^${escapeRegex(ign)}$`, 'i') }
  });

  if (!player) {
    return { success: false, error: `IGN **${ign}** not found. Make sure you are registered with \`/register\` first.` };
  }

  // Verify the IGN belongs to the requesting user
  if (player.discordId !== discordId) {
    return { success: false, error: 'This IGN does not belong to your Discord account.' };
  }

  // Add participant
  reg.participants.push({ discordId, ign: player.ign });
  await reg.save();

  return { success: true };
}

/**
 * Close a registration (set active = false).
 * @param {string} regId
 */
async function closeRegistration(regId) {
  return IntraRegistration.findByIdAndUpdate(regId, { active: false }, { returnDocument: 'after' });
}

/**
 * Get all expired but still active registrations.
 */
async function getExpired() {
  return IntraRegistration.find({
    active: true,
    endTime: { $ne: null, $lte: new Date() }
  });
}

/** Escape special regex characters in user input */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  getActive,
  createRegistration,
  setEndTime,
  addParticipant,
  closeRegistration,
  getExpired
};
