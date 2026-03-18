/**
 * leaderboardEngine.js
 *
 * Handles all point tracking, leaderboard sorting, and Player model enrichment.
 * Coordinates between the Event model and the Player model to build ranked results.
 */

const Event = require('../models/Event');
const Player = require('../../../bot/database/models/Player');

/**
 * Adds (or updates) a participant's points in an event.
 * Points are additive — calling this multiple times adds up.
 *
 * @param {string} eventId - The event's custom ID (e.g., "cb-001")
 * @param {string} discordId - The target user's Discord ID
 * @param {number} pointsDelta - Amount to add (positive) or subtract (negative)
 * @returns {object} Updated event document
 */
async function addPoints(eventId, discordId, pointsDelta) {
  const event = await Event.findOne({ eventId });
  if (!event) throw new Error(`Event \`${eventId}\` not found.`);
  if (event.status !== 'active') throw new Error(`Event \`${eventId}\` is not active.`);

  // Update points map — get current or default to 0
  const current = event.points.get(discordId) || 0;
  const updated = Math.max(0, current + pointsDelta); // Floor at 0
  event.points.set(discordId, updated);

  // Track participants list (ensure no duplicates)
  if (!event.participants.includes(discordId)) {
    event.participants.push(discordId);
  }

  // Recalculate sorted leaderboard
  event.leaderboard = buildSortedLeaderboard(event.points);

  await event.save();
  return event;
}

/**
 * Converts a points Map into a sorted leaderboard array.
 * @param {Map} pointsMap
 * @returns {Array<{ discordId, points }>}
 */
function buildSortedLeaderboard(pointsMap) {
  const entries = [];
  for (const [discordId, pts] of pointsMap.entries()) {
    entries.push({ discordId, points: pts });
  }
  return entries.sort((a, b) => b.points - a.points);
}

/**
 * Returns an enriched leaderboard for display, joining Player IGN and synergy data.
 *
 * @param {string} eventId
 * @returns {Array<{ rank, discordId, ign, points, seasonSynergy }>}
 */
async function getRichLeaderboard(eventId) {
  const event = await Event.findOne({ eventId });
  if (!event) throw new Error(`Event \`${eventId}\` not found.`);

  const board = event.leaderboard;

  // Batch-fetch all relevant players in one query
  const discordIds = board.map(e => e.discordId);
  const players = await Player.find({ discordId: { $in: discordIds } });
  const playerMap = {};
  for (const p of players) {
    playerMap[p.discordId] = p;
  }

  // Build enriched result
  return board.map((entry, idx) => {
    const player = playerMap[entry.discordId] || null;
    return {
      rank: idx + 1,
      discordId: entry.discordId,
      ign: player?.ign || null,
      points: entry.points,
      seasonSynergy: player?.seasonSynergy || 0
    };
  });
}

/**
 * Returns the final sorted leaderboard limited to maxWinners.
 * @param {string} eventId
 * @param {number} maxWinners
 */
async function getWinners(eventId, maxWinners) {
  const board = await getRichLeaderboard(eventId);
  return board.slice(0, maxWinners);
}

module.exports = { addPoints, getRichLeaderboard, getWinners, buildSortedLeaderboard };
