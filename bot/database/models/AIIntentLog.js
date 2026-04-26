const mongoose = require('mongoose');

const aiIntentLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  username: String,
  prompt: String,
  intent: { type: String, enum: ['assist', 'moderate', 'execute', 'analyze', 'chat', 'tool'], default: 'chat' },
  model: String,
  timestamp: { type: Date, default: Date.now }
});

// Index for fast retrieval
aiIntentLogSchema.index({ guildId: 1, timestamp: -1 });

module.exports = mongoose.model('AIIntentLog', aiIntentLogSchema);
