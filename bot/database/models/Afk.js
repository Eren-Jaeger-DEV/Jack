const mongoose = require("mongoose");

const afkSchema = new mongoose.Schema({

  userId: {
    type: String,
    required: true,
    unique: true
  },

  reason: {
    type: String,
    default: "AFK"
  },

  since: {
    type: Date,
    default: Date.now
  },

  pings: {
    type: Number,
    default: 0
  }

});

module.exports = mongoose.model("Afk", afkSchema);