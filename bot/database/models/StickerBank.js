const mongoose = require("mongoose");

const StickerBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  stickerID: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true
  },
  format: {
    type: String, // 'png', 'lottie', 'apng'
    required: true
  },
  addedBy: {
    type: String,
    required: true
  },
  sourceGuild: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("StickerBank", StickerBankSchema);
