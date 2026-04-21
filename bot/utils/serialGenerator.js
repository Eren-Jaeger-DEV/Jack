/**
 * serialGenerator.js
 * 
 * Utility to generate sequential serial numbers for players.
 * JCM## (01-60) for Clan Members - Reusable slots.
 * JDM#### (0001+) for Discord Members - Sequential.
 */

const Player = require('../database/models/Player');

// Clan Roles that qualify for JCM
const CLAN_ROLE_IDS = [
  '1477856665817714699', // Clan Member
  '1477860065577795676', // Clan Elite Member
  '1477860583976992900', // Clan Co-leader
  '1477866925492146327'  // Clan Leader
];

const DISCORD_MEMBER_ROLE_ID = '1486182016415301763';

/**
 * Get the next available serial number for a specific category.
 * @param {boolean} isClanMember - Whether the player is a clan member.
 * @returns {Promise<string|null>} - The next serial number or null if no JCM slots available.
 */
async function getNextSerialNumber(isClanMember) {
  if (isClanMember) {
    // JCM Logic: Find the first available gap in 01-60
    const existingJCMs = await Player.find({ serialNumber: /^JCM\d{2}$/ })
      .select('serialNumber')
      .lean();
    
    const usedSlots = existingJCMs.map(p => parseInt(p.serialNumber.replace('JCM', ''), 10));
    
    for (let i = 1; i <= 60; i++) {
      if (!usedSlots.includes(i)) {
        return `JCM${String(i).padStart(2, '0')}`;
      }
    }
    return null; // No slots available
  } else {
    // JDM Logic: Standard sequential
    const lastJDM = await Player.findOne({ serialNumber: /^JDM\d{4}$/ })
      .sort({ serialNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastJDM && lastJDM.serialNumber) {
      nextNumber = parseInt(lastJDM.serialNumber.replace('JDM', ''), 10) + 1;
    }
    return `JDM${String(nextNumber).padStart(4, '0')}`;
  }
}

/**
 * Check if a member has any of the clan roles.
 * @param {GuildMember} member 
 */
function hasClanRole(member) {
  if (!member || !member.roles) return false;
  return CLAN_ROLE_IDS.some(id => member.roles.cache.has(id));
}

/**
 * Check if a member has the Discord Member role.
 * @param {GuildMember} member 
 */
function hasDiscordMemberRole(member) {
  if (!member || !member.roles) return false;
  return member.roles.cache.has(DISCORD_MEMBER_ROLE_ID);
}

module.exports = { 
  getNextSerialNumber, 
  hasClanRole, 
  hasDiscordMemberRole,
  CLAN_ROLE_IDS,
  DISCORD_MEMBER_ROLE_ID
};
