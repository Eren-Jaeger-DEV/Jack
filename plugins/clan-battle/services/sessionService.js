/**
 * plugins/clan-battle/services/sessionService.js
 *
 * Tracks active leaderboard screenshot upload sessions for Clan Battles.
 */

'use strict';

const logger = require('../../../utils/logger');

// Store: userId -> { guildId, channelId, imageUrls: [], expires: number, unmatched: [], updatedPlayerIds: [] }
const sessions = new Map();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Start or resume a session for a user.
 */
function startSession(userId, guildId, channelId) {
  const expires = Date.now() + SESSION_TIMEOUT_MS;
  
  if (sessions.has(userId)) {
    const existing = sessions.get(userId);
    existing.expires = expires;
    return existing;
  }

  const session = {
    guildId,
    channelId,
    imageUrls: [],
    unmatched: [],
    updatedPlayerIds: [],
    expires
  };
  
  sessions.set(userId, session);
  return session;
}

/**
 * Add an image to a user's session.
 */
function addImage(userId, imageUrl) {
  const session = sessions.get(userId);
  if (!session) return false;

  session.imageUrls.push(imageUrl);
  session.expires = Date.now() + SESSION_TIMEOUT_MS;
  return true;
}

/**
 * Get a user's current session.
 */
function getSession(userId) {
  const session = sessions.get(userId);
  if (!session) return null;

  if (Date.now() > session.expires) {
    sessions.delete(userId);
    return null;
  }

  return session;
}

/**
 * End and delete a session.
 */
function endSession(userId) {
  return sessions.delete(userId);
}

/**
 * Cleanup expired sessions (Internal).
 */
function _cleanup() {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now > session.expires) {
      sessions.delete(userId);
      logger.info("ClanBattle", `Expired session for user ${userId} cleaned up.`);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(_cleanup, 5 * 60 * 1000);

module.exports = {
  startSession,
  addImage,
  getSession,
  endSession
};
