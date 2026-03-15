const mongoose = require("mongoose");

const LevelSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  xp: {
    type: Number,
    default: 0
  },
  weeklyXp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 0
  },
  background: {
    type: String,
    default: ""
  },
  lastMessage: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster leaderboard queries and direct user lookups
LevelSchema.index({ guildId: 1, xp: -1 });
LevelSchema.index({ guildId: 1, weeklyXp: -1 });
LevelSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model("Level", LevelSchema);