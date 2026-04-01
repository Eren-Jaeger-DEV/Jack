const mongoose = require('mongoose');

/**
 * CONVERSATION HISTORY (AI Memory)
 * Stores the past 20 messages per channel to provide persistent context.
 * Role: 'user' or 'model' (Compatible with Google Gemini API)
 */
const ConversationHistorySchema = new mongoose.Schema({
  channelId: { type: String, required: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-expire history after 7 days of inactivity to keep DB clean
ConversationHistorySchema.index({ lastActive: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('ConversationHistory', ConversationHistorySchema);
