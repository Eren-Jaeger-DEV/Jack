const Player = require('../database/models/Player');

/**
 * Resolves a player document from the database using either a Discord User object/ID or a numeric UID.
 * 
 * @param {Object} options
 * @param {Object|string} [options.user] - The Discord User object or discord ID string.
 * @param {string} [options.uid] - The in-game UID string (can include "uid:" prefix).
 * @returns {Promise<{ player: Object|null, error: string|null }>}
 */
async function resolvePlayer({ user, uid }) {
  if (!user && !uid) {
    return { player: null, error: 'You must provide either a Discord user or a UID.' };
  }

  let player = null;

  try {
    if (user) {
      const discordId = typeof user === 'string' ? user : user.id;
      player = await Player.findOne({ discordId });
    } else if (uid) {
      // Strip out optional "uid:" prefix and whitespace
      const parsedUid = String(uid).replace(/^uid:/i, '').trim();
      player = await Player.findOne({ uid: parsedUid });
    }

    if (!player) {
      return { player: null, error: 'Player not found in the database.' };
    }

    return { player, error: null };
  } catch (err) {
    console.error('[Resolver] resolvePlayer error:', err);
    return { player: null, error: 'Database error occurred while resolving player.' };
  }
}

module.exports = { resolvePlayer };
