const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  guildId:              { type: String, required: true },
  active:               { type: Boolean, default: true },
  channelId:            { type: String, required: true },
  leaderboardMessageId: { type: String, default: null },
  createdAt:            { type: Date, default: Date.now }
});

module.exports = mongoose.model('Season', seasonSchema);
