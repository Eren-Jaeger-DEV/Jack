const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({

  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  isClanMember: {
    type: Boolean,
    default: false
  },

  registered: {
    type: Boolean,
    default: false
  },

  discordName: String,

  ign: String,
  uid: String,

  accountLevel: String,

  preferredModes: [String],

  clanJoinDate: Date,

  seasonSynergy: {
    type: Number,
    default: 0
  },

  weeklySynergy: {
    type: Number,
    default: 0
  },

  lastWeeklySubmission: {
    type: String,
    default: ''
  },

  achievements: {
    intraWins:           { type: Number, default: 0 },
    clanBattleWins:      { type: Number, default: 0 },
    bestClanBattleRank:  { type: Number, default: null },
    fosterWins:          { type: Number, default: 0 },
    fosterParticipation: { type: Number, default: 0 },
    weeklyMVPCount:      { type: Number, default: 0 },
    highestSeasonRank:   { type: Number, default: null }
  },

  screenshot: String

}, { timestamps: true });

module.exports = mongoose.model("Player", playerSchema);