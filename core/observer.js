const UserActivity = require("../bot/database/models/UserActivity");
const { addLog } = require("../utils/logger");

// IN-MEMORY PERFORMANCE BUFFER
const activityBuffer = new Map(); // discordId -> { count, lastSave }
const SAVE_INTERVAL_MS = 60000; // 1 minute between DB writes per user
const BATCH_SIZE = 10; // Save every 10 messages

/**
 * OBSERVER (v1.0.0)
 * Passive behavioral tracking layer.
 */
module.exports = {
  
  /**
   * Passive listener for messages.
   * Increments count and updates last active time with buffering.
   */
  async recordActivity(message) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const now = Date.now();

    // 1. Update in-memory buffer
    let data = activityBuffer.get(userId) || { count: 0, lastSave: 0 };
    data.count += 1;
    activityBuffer.set(userId, data);

    // 2. Determine if we should flush to DB
    const shouldFlush = (data.count >= BATCH_SIZE) || (now - data.lastSave > SAVE_INTERVAL_MS);

    if (shouldFlush) {
      this._flushToDB(userId, data.count);
      // Remove from buffer entirely — re-created on next message.
      // Prevents unbounded Map growth for inactive users over long uptimes.
      activityBuffer.delete(userId);
    }
  },

  /**
   * Lifecycle recording: Member Join
   */
  async recordJoin(member) {
    try {
      await UserActivity.findOneAndUpdate(
        { discordId: member.id },
        { joinDate: Date.now() },
        { upsert: true }
      );
      addLog("Observer", `Join event tracked for ${member.user.tag}`);
    } catch (e) {}
  },

  /**
   * Lifecycle recording: Member Leave
   */
  async recordLeave(member) {
    try {
      await UserActivity.findOneAndUpdate(
        { discordId: member.id },
        { leaveDate: Date.now() }
      );
      addLog("Observer", `Leave event tracked for ${member.user.tag}`);
    } catch (e) {}
  },

  /**
   * Performance Tracking: Successful AI Action
   */
  async recordActionSuccess(userId, actionType) {
    try {
      await UserActivity.findOneAndUpdate(
        { discordId: userId },
        { 
          $inc: { successfulActions: 1 },
          $set: { lastActionType: actionType }
        },
        { upsert: true }
      );
    } catch (e) {}
  },

  /**
   * Performance Tracking: Failed AI Action
   */
  async recordActionFailure(userId, actionType) {
    try {
      await UserActivity.findOneAndUpdate(
        { discordId: userId },
        { 
          $inc: { failedActions: 1 },
          $set: { lastActionType: actionType }
        },
        { upsert: true }
      );
    } catch (e) {}
  },

  /**
   * Internal DB Flush
   */
  async _flushToDB(userId, count) {
    try {
      await UserActivity.findOneAndUpdate(
        { discordId: userId },
        { 
          $inc: { messageCount: count },
          $set: { lastActive: Date.now() }
        },
        { upsert: true }
      );
    } catch (e) {
      console.error("[Observer] DB Flush Failed:", e.message);
    }
  }
};
