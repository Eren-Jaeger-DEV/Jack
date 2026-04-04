const mongoose = require("mongoose");

const tictactoeStatsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  draws: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("TicTacToeStats", tictactoeStatsSchema);
