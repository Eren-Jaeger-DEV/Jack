const mongoose = require('mongoose');

/**
 * USER ACTIVITY (Behavioral Signals)
 * Tracks passive signals like message frequency and active times.
 * This does NOT store message content.
 */
const UserActivitySchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  
  // ACTIVITY METRICS
  messageCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  activityScore: { type: Number, default: 0 }, // Relative performance metric
  
  // LIFECYCLE
  joinDate: { type: Date, default: null },
  leaveDate: { type: Date, default: null },

  // AI PERFORMANCE FEEDBACK
  successfulActions: { type: Number, default: 0 },
  failedActions: { type: Number, default: 0 },
  lastActionType: { type: String }
  
}, { timestamps: true });

// Auto-calculate simple activity score on save
UserActivitySchema.pre('save', function(next) {
  // Score = Count / Days since join (normalized)
  this.activityScore = this.messageCount; 
  next();
});

module.exports = mongoose.model('UserActivity', UserActivitySchema);
