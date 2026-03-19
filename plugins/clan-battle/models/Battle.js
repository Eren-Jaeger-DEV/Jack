const mongoose = require('mongoose');

const playerEntrySchema = new mongoose.Schema({
  userId:            { type: String, required: true },
  ign:               { type: String, required: true },
  todayPoints:       { type: Number, default: 0 },
  totalPoints:       { type: Number, default: 0 },
  lastSubmittedDate: { type: String, default: '' }
}, { _id: false });

const battleSchema = new mongoose.Schema({
  guildId:               { type: String, required: true },
  active:                { type: Boolean, default: true },
  channelId:             { type: String, required: true },
  leaderboardMessageId:  { type: String, default: null },
  players:               { type: [playerEntrySchema], default: [] },
  createdAt:             { type: Date, default: Date.now }
});

module.exports = mongoose.model('Battle', battleSchema);
