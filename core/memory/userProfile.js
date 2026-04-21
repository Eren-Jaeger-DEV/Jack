const mongoose = require('mongoose');

/**
 * UNIFIED USER PROFILE (v1.0.0)
 * Aggregates all known data points for a user into a single JSON dossier.
 */
module.exports = {

  async getFullProfile(userId, guild) {
    try {
      const Player = mongoose.model('Player');
      const MemberDiary = mongoose.model('MemberDiary');
      const Level = mongoose.model('Level');
      const UserActivity = mongoose.model('UserActivity');

      // 1. Fetch all data points concurrently
      const [player, diary, level, activity, activeBattle] = await Promise.all([
        Player.findOne({ discordId: userId }),
        MemberDiary.findOne({ discordId: userId }),
        Level.findOne({ userId }),
        UserActivity.findOne({ discordId: userId }),
        mongoose.model('Battle').findOne({ active: true, "players.userId": userId })
      ]);

      const member = guild.members.cache.get(userId);
      const battlePlayer = activeBattle ? activeBattle.players.find(p => p.userId === userId) : null;

      // 2. Build the structured Dossier
      return {
        basic: {
          id: userId,
          username: member?.user.tag || "Unknown",
          roles: member?.roles.cache.map(r => r.name).filter(n => n !== "@everyone") || []
        },
        activity: {
          messageCount: activity?.messageCount || 0,
          lastActive: activity?.lastActive ? this._relativeTime(activity.lastActive) : "Never",
          activityScore: activity?.activityScore || 0
        },
        clan_performance: player ? {
          ign: player.ign,
          uid: player.uid,
          weeklySynergy: player.weeklySynergy || 0,
          seasonSynergy: player.seasonSynergy || 0,
          clanBattlePoints: battlePlayer ? {
            today: battlePlayer.todayPoints,
            total: battlePlayer.totalPoints
          } : "Not in active battle",
          role: player.role
        } : "Not Registered",
        progression: level ? {
          xp_level: level.level,
          totalMessages: level.totalMessages
        } : null,
        personality: diary ? {
          reputation: diary.reputationScore,
          loyalty: diary.loyaltyStatus,
          profileSummary: diary.personalityProfile,
          lastInteracted: diary.lastInteraction
        } : null
      };
    } catch (err) {
      console.error("[UserProfile] Failed to aggregate profile:", err.message);
      return { error: "Access Denied" };
    }
  },

  _relativeTime(date) {
    if (!date) return "Never";
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + "y ago";
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + "m ago";
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + "d ago";
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + "m ago";
    return Math.floor(seconds) + "s ago";
  }
};
