const mongoose = require("mongoose");

const EmojiPackSchema = new mongoose.Schema({
  packName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  emojiList: {
    type: [String], // Array of Emoji IDs
    default: []
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("EmojiPack", EmojiPackSchema);
