/**
 * JACK PERMISSION UTILITY (v1.0.0)
 * Centralized Role-Based Access Control (RBAC) logic.
 */

const { PermissionFlagsBits } = require('discord.js');
const { OWNER_IDS } = require('./persona');

const ROLES = {
    SUPREME: ['Manager', 'PapaPlayer'],
    MANAGEMENT: ['Admins', 'Moderator'],
    CONTRIBUTORS: ['Contributors'],
    BOOSTER: ['Clan Booster']
};

/**
 * Checks if a member has a specific role by name.
 */
function hasRole(member, roleNames) {
    if (!member || !member.roles) return false;
    return member.roles.cache.some(r => roleNames.includes(r.name));
}

/**
 * Management Personnel: Supreme roles, Admin, or Moderator roles.
 */
function isManagement(member) {
    if (!member) return false;
    // 🛡️ High-Priority Permission Check
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    // Fallback to designated roles
    return isOwner(member) || hasRole(member, ROLES.MANAGEMENT);
}

/**
 * Supreme Authority: Technical Owners, Manager, or PapaPlayer roles.
 */
function isOwner(member) {
    if (!member) return false;
    const isTechnicalOwner = OWNER_IDS.includes(member.id);
    const hasOwnerRole = hasRole(member, ROLES.SUPREME);
    return isTechnicalOwner || hasOwnerRole;
}

/**
 * High Staff: Management + Contributors.
 */
function isHighStaff(member) {
    if (!member) return false;
    return isManagement(member) || hasRole(member, ROLES.CONTRIBUTORS);
}

/**
 * Clan Booster: Specifically for extra chat perks.
 */
function isBooster(member) {
    if (!member) return false;
    return hasRole(member, ROLES.BOOSTER) || (member.premiumSince !== null); // Include Nitro Boosters too
}

/**
 * Full Bypass: Owner, Manager, Admins, Contributors.
 * Bypasses ALL restrictions including cooldowns and channel enforcements.
 */
function hasFullBypass(member) {
    return isOwner(member) || isHighStaff(member);
}

/**
 * Extra Perks: Full Bypass members + Clan Boosters.
 * Bypasses chat restrictions (Media, Links, Commands) in #general.
 */
function hasExtraPerks(member) {
    return hasFullBypass(member) || isBooster(member);
}

module.exports = {
    isOwner,
    isManagement,
    isHighStaff,
    isBooster,
    hasFullBypass,
    hasExtraPerks,
    ROLES
};
