/**
 * JACK PERMISSION UTILITY (v1.0.0)
 * Centralized Role-Based Access Control (RBAC) logic.
 */

const { PermissionFlagsBits } = require('discord.js');
const { OWNER_IDS } = require('./persona');

const ROLES = {
    SUPREME: ['Manager', 'PapaPlayer'],
    HIGH_STAFF: ['Admins', 'Contributors'],
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
 * Supreme Authority: Technical Owners, Manager, or PapaPlayer roles.
 */
function isOwner(member) {
    if (!member) return false;
    const isTechnicalOwner = OWNER_IDS.includes(member.id);
    const hasOwnerRole = hasRole(member, ROLES.SUPREME);
    return isTechnicalOwner || hasOwnerRole;
}

/**
 * High Staff: Admins or Contributors.
 */
function isHighStaff(member) {
    if (!member) return false;
    return hasRole(member, ROLES.HIGH_STAFF) || member.permissions.has(PermissionFlagsBits.Administrator);
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
    isHighStaff,
    isBooster,
    hasFullBypass,
    hasExtraPerks,
    ROLES
};
