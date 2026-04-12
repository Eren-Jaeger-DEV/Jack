const Level = require("../database/models/Level");
const xpCache = require("../../plugins/leveling/xpCache");
const logger = require("../../utils/logger");

/* Store VC join timestamps in memory */
const voiceSessions = new Map();

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    try {

      const member = newState.member;
      const userId = member.id;
      const guildId = member.guild.id;

      /* USER JOINED VOICE */

      if (!oldState.channel && newState.channel) {

        voiceSessions.set(userId, Date.now());

      }

      /* USER LEFT VOICE */

      if (oldState.channel && !newState.channel) {

        const joinTime = voiceSessions.get(userId);
        if (!joinTime) return;

        voiceSessions.delete(userId);

        const timeSpent = Date.now() - joinTime;

        /* minutes in VC */

        const minutes = Math.floor(timeSpent / 60000);

        if (minutes <= 0) return;

        /* Anti AFK: must have 2+ people in VC */

        if (oldState.channel.members.size < 2) return;

        const xpGain = minutes * 10;

        xpCache.addXP(guildId, userId, xpGain);

      }

      /* USER SWITCHED CHANNEL */

      if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {

        const joinTime = voiceSessions.get(userId);
        if (!joinTime) return;

        const timeSpent = Date.now() - joinTime;

        const minutes = Math.floor(timeSpent / 60000);

        voiceSessions.set(userId, Date.now());

        if (minutes <= 0) return;

        if (oldState.channel.members.size < 2) return;

        const xpGain = minutes * 10;

        xpCache.addXP(guildId, userId, xpGain);

      }

    } catch (err) {
      logger.error("VoiceStateUpdate", `Unhandled error: ${err.message}`);
    }
  }
};