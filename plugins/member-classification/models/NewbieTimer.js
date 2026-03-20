const mongoose = require('mongoose');

const newbieTimerSchema = new mongoose.Schema({
  guildId:    { type: String, required: true },
  userId:     { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  expiresAt:  { type: Date, required: true }
});

// Compound index to prevent duplicates
newbieTimerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('NewbieTimer', newbieTimerSchema);
