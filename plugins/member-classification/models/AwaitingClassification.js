const mongoose = require('mongoose');

const awaitingClassificationSchema = new mongoose.Schema({
  guildId:    { type: String, required: true },
  userId:     { type: String, required: true },
  messageId:  { type: String, required: true },
  joinedAt:   { type: Date, default: Date.now },
  lastRemindedAt: { type: Date, default: null }
});

// Compound index to prevent duplicates and enable efficient lookups
awaitingClassificationSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AwaitingClassification', awaitingClassificationSchema);
