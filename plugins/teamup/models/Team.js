const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  leaderId: { type: String, required: true },
  members: { type: [String], default: [] },
  maxSize: { type: Number, required: true },
  type: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  messageId: { type: String, required: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  lastReminderAt: { type: Date, default: null }
});

module.exports = mongoose.model("Team", teamSchema);
