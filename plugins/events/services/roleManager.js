/**
 * roleManager.js
 *
 * Handles all role assignment and removal for event winners and participants.
 * Ensures no duplicate roles and safely cleans up previous winners.
 */

/**
 * Assigns a role to a member. Silently skips if they already have it.
 * @param {import('discord.js').Guild} guild
 * @param {string} discordId
 * @param {string} roleId
 */
async function assignRole(guild, discordId, roleId) {
  if (!roleId) return;
  try {
    const member = await guild.members.fetch(discordId);
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId);
    }
  } catch (err) {
    console.error(`[EventSystem] Failed to assign role ${roleId} to ${discordId}:`, err.message);
  }
}

/**
 * Removes a role from a specific member. Silently skips if they don't have it.
 * @param {import('discord.js').Guild} guild
 * @param {string} discordId
 * @param {string} roleId
 */
async function removeRole(guild, discordId, roleId) {
  if (!roleId) return;
  try {
    const member = await guild.members.fetch(discordId);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
    }
  } catch (err) {
    console.error(`[EventSystem] Failed to remove role ${roleId} from ${discordId}:`, err.message);
  }
}

/**
 * Strips a role from ALL members who currently hold it.
 * Used to clear the winner badge before assigning the new winners.
 * @param {import('discord.js').Guild} guild
 * @param {string} roleId
 */
async function stripRoleFromAll(guild, roleId) {
  if (!roleId) return;
  try {
    const role = await guild.roles.fetch(roleId);
    if (!role) return;

    // Fetch fresh member cache to find all current holders
    await guild.members.fetch();
    const holders = guild.members.cache.filter(m => m.roles.cache.has(roleId));

    const promises = holders.map(member => member.roles.remove(roleId).catch(() => {}));
    await Promise.all(promises);

    console.log(`[EventSystem] Stripped role ${roleId} from ${holders.size} members.`);
  } catch (err) {
    console.error(`[EventSystem] Failed to strip role ${roleId} from all:`, err.message);
  }
}

/**
 * High-level function: clear old winners, then assign new winners.
 * @param {import('discord.js').Guild} guild
 * @param {string} roleId - Winner role ID
 * @param {string[]} winnerDiscordIds - New winners to assign the role to
 */
async function rotateWinnerRole(guild, roleId, winnerDiscordIds) {
  if (!roleId) return;
  // Step 1: Strip old winners
  await stripRoleFromAll(guild, roleId);
  // Step 2: Assign new winners
  for (const discordId of winnerDiscordIds) {
    await assignRole(guild, discordId, roleId);
  }
}

/**
 * Assigns the participant role to a list of users (used in intra matches).
 */
async function assignParticipantRoles(guild, roleId, discordIds) {
  if (!roleId) return;
  for (const id of discordIds) {
    await assignRole(guild, id, roleId);
  }
}

module.exports = { assignRole, removeRole, stripRoleFromAll, rotateWinnerRole, assignParticipantRoles };
