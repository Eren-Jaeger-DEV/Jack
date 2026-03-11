const mongoose = require("mongoose");

const EmojiUsageSchema = new mongoose.Schema({
  emojiName: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  userID: {
    type: String,
    required: true
  }
});

// Compound index for fast user-specific emoji lookups
EmojiUsageSchema.index({ emojiName: 1, userID: 1 }, { unique: true });

module.exports = mongoose.model("EmojiUsage", EmojiUsageSchema);
