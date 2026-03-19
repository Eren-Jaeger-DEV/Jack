/**
 * roleManager.js — Role assignment/removal helpers
 *
 * Wraps all role operations with error handling so a single
 * missing member or permission issue doesn't crash the flow.
 */

/**
 * Assign a role to a single user.
 * @param {Guild} guild
 * @param {string} userId
 * @param {string} roleId
 */
async function assignRole(guild, userId, roleId) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return false;

    const role = guild.roles.cache.get(roleId);
    if (!role) return false;

    await member.roles.add(role);
    return true;
  } catch (err) {
    console.error(`[IntraMatch] Failed to assign role ${roleId} to ${userId}:`, err.message);
    return false;
  }
}

/**
 * Remove a role from ALL members who currently have it.
 * @param {Guild} guild
 * @param {string} roleId
 */
async function removeRoleFromAll(guild, roleId) {
  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) return;

    // Fetch all members who have this role
    const membersWithRole = role.members;

    for (const [, member] of membersWithRole) {
      await member.roles.remove(role).catch(err => {
        console.error(`[IntraMatch] Failed to remove role from ${member.user.tag}:`, err.message);
      });
    }
  } catch (err) {
    console.error(`[IntraMatch] Failed to bulk-remove role ${roleId}:`, err.message);
  }
}

module.exports = { assignRole, removeRoleFromAll };
