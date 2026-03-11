const mongoose = require("mongoose");

const EmojiBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  emojiID: {
    type: String, // Or a generated unique ID for our system
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true
  },
  format: {
    type: String, // 'png', 'gif'
    required: true
  },
  pack: {
    type: String,
    default: "none",
    lowercase: true,
    index: true
  },
  addedBy: {
    type: String, // User ID who added it
    required: true
  },
  sourceGuild: {
    type: String, // Guild ID where it was stolen from, useful for context
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("EmojiBank", EmojiBankSchema);
