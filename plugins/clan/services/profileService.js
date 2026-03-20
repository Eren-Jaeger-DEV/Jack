/**
 * profileService.js — Profile & Achievements Service
 *
 * Centralized logic for reading and updating player achievements.
 * PATCH 1 & 2: Safe atomic updates with $inc and conditional $set.
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
 * PATCH 1: Safe atomic increment using findOneAndUpdate.
 * Will not crash if player is missing, uses $inc for race-safety.
 */
async function incrementAchievement(userId, field, amount = 1) {
  try {
    await Player.findOneAndUpdate(
      { discordId: userId },
      { $inc: { [field]: amount } },
      { new: true }
    );
  } catch (err) {
    console.error(`[ProfileService] Achievement increment error (${field}, ${userId}):`, err.message);
  }
}

/**
 * PATCH 2: Set achievement only if the new value is better (lower rank).
 * Handles null/undefined gracefully.
 */
async function setAchievementIfBetter(userId, field, newValue) {
  try {
    const player = await Player.findOne({ discordId: userId });
    if (!player) return;

    const shortField = field.replace('achievements.', '');
    const current = player.achievements?.[shortField];

    if (current === null || current === undefined || newValue < current) {
      if (!player.achievements) player.achievements = {};
      player.achievements[shortField] = newValue;
      await player.save();
    }
  } catch (err) {
    console.error(`[ProfileService] Achievement best-value error (${field}, ${userId}):`, err.message);
  }
}

module.exports = {
  getProfile,
  getAchievements,
  incrementAchievement,
  setAchievementIfBetter
};
