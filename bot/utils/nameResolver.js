/**
 * Resolve a user's Discord display name with a fallback to IGN.
 * Safely handles cache misses and members who left the guild.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 * @param {string} fallbackIgn
 * @returns {Promise<string>}
 */
async function resolveDisplayName(guild, userId, fallbackIgn) {
  if (!guild) return fallbackIgn || userId;
  try {
    // Attempt to fetch member to ensure cache is populated/data is fresh
    const member = await guild.members.fetch(userId).catch(() => null);
    return member ? member.displayName : (fallbackIgn || userId);
  } catch (err) {
    return fallbackIgn || userId;
  }
}

module.exports = { resolveDisplayName };
