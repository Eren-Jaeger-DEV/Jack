/**
 * profileService.js — Profile & Achievements Service
 *
 * Centralized logic for reading and updating player achievements.
 * Atomic updates with $inc and conditional $set.
 */

const Player = require('../../../bot/database/models/Player');

/**
 * Get a player's full profile.
 */
async function getProfile(userId) {
  try {
    return await Player.findOne({ discordId: userId });
  } catch (err) {
    console.error(`[ProfileService] getProfile error for ${userId}:`, err.message);
    return null;
  }
}

/**
 * Get a player's achievements (with null-safe defaults).
 */
async function getAchievements(userId) {
  try {
    const player = await Player.findOne({ discordId: userId });
    if (!player) return null;

    return {
      intraWins:           player.achievements?.intraWins ?? 0,
      clanBattleWins:      player.achievements?.clanBattleWins ?? 0,
      bestClanBattleRank:  player.achievements?.bestClanBattleRank ?? null,
      fosterWins:          player.achievements?.fosterWins ?? 0,
      fosterParticipation: player.achievements?.fosterParticipation ?? 0,
      weeklyMVPCount:      player.achievements?.weeklyMVPCount ?? 0,
      highestSeasonRank:   player.achievements?.highestSeasonRank ?? null
    };
  } catch (err) {
    console.error(`[ProfileService] getAchievements error for ${userId}:`, err.message);
    return null;
  }
}

/**
 * Safe atomic increment using findOneAndUpdate.
 * Will not crash if player is missing, uses $inc for race-safety.
 * @param {string} userId
 * @param {string} field - Achievement sub-field (e.g., 'achievements.clanBattleWins')
 * @param {number} amount
 */
async function incrementAchievement(userId, field, amount = 1) {
  try {
    if (!field.startsWith('achievements.')) field = `achievements.${field}`;
    
    await Player.findOneAndUpdate(
      { discordId: userId },
      { $inc: { [field]: amount } },
      { new: true, upsert: true }
    );
  } catch (err) {
    console.error(`[ProfileService] Achievement increment error (${field}, ${userId}):`, err.message);
  }
}

/**
 * Set achievement only if the new value is better (lower rank).
 * Handles null/undefined gracefully.
 * @param {string} userId
 * @param {string} field - Achievement sub-field (e.g., 'achievements.bestClanBattleRank')
 * @param {number} newValue
 */
async function setAchievementIfBetter(userId, field, newValue) {
  if (!newValue || newValue <= 0) return;
  try {
    const player = await Player.findOne({ discordId: userId });
    if (!player) return;

    if (!field.startsWith('achievements.')) field = `achievements.${field}`;
    const shortField = field.replace('achievements.', '');
    const current = player.achievements?.[shortField];

    // Better if currently null, or new value is less than current (e.g. Rank 1 is better than Rank 5)
    if (current === null || current === undefined || current === 0 || newValue < current) {
      await Player.findOneAndUpdate(
        { discordId: userId },
        { $set: { [field]: newValue } }
      );
    }
  } catch (err) {
    console.error(`[ProfileService] Achievement best-value error (${field}, ${userId}):`, err.message);
  }
}

/**
 * Manually set an achievement field value.
 * @param {string} userId
 * @param {string} field
 * @param {any} value
 */
async function setAchievement(userId, field, value) {
  try {
    if (!field.startsWith('achievements.')) field = `achievements.${field}`;
    
    await Player.findOneAndUpdate(
      { discordId: userId },
      { $set: { [field]: value } },
      { new: true, upsert: true }
    );
  } catch (err) {
    console.error(`[ProfileService] Achievement manual set error (${field}, ${userId}):`, err.message);
  }
}

module.exports = {
  getProfile,
  getAchievements,
  incrementAchievement,
  setAchievementIfBetter,
  setAchievement
};
