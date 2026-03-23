const { ROLE_ID } = require("../config");

async function assignRole(guild, userId) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return false;

    const role = guild.roles.cache.get(ROLE_ID);
    if (!role) {
      console.warn(`[TeamUp] Role ${ROLE_ID} not found in guild ${guild.id}`);
      return false;
    }

    await member.roles.add(role).catch(() => {});
    return true;
  } catch (err) {
    console.error(`[TeamUp] Failed to assign role to ${userId}:`, err.message);
    return false;
  }
}

async function removeRole(guild, userId) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return false;

    const role = guild.roles.cache.get(ROLE_ID);
    if (!role) return false;

    await member.roles.remove(role).catch(() => {});
    return true;
  } catch (err) {
    console.error(`[TeamUp] Failed to remove role from ${userId}:`, err.message);
    return false;
  }
}

async function removeRoleFromMany(guild, userIds) {
  for (const userId of userIds) {
    await removeRole(guild, userId);
  }
}

module.exports = { assignRole, removeRole, removeRoleFromMany };
