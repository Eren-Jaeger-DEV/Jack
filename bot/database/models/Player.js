const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({

  discordId: {
    type: String,
    required: true,
    unique: true
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

  screenshot: String

}, { timestamps: true });

module.exports = mongoose.model("Player", playerSchema);