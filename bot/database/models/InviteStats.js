const mongoose = require("mongoose");

const inviteStatsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  invites: {
    type: Number,
    default: 0
  },
  fake: {
    type: Number,
    default: 0
  },
  leaves: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Index for fast lookups and ensuring uniqueness per user per guild
inviteStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model("InviteStats", inviteStatsSchema);
