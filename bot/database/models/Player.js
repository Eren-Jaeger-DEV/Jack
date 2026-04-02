const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({

  discordId: {
    type: String,
    sparse: true,
    unique: true
  },

  status: {
    type: String,
    enum: ["linked", "unlinked"],
    default: "linked"
  },

  createdBy: {
    type: String,
    default: null
  },

  isManual: {
    type: Boolean,
    default: false
  },

  role: {
    type: String,
    enum: ["owner", "manager", "admin", "contributor", "none"],
    default: "none"
  },

  isDeleted: {
    type: Boolean,
    default: false
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
  username: String,
  avatar: String,

  ign: String,
  uid: String,

  accountLevel: String,

  preferredModes: [String],

  clanJoinDate: Date,

  lastSeasonSynergy: {
    type: Number,
    default: 0
  },

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