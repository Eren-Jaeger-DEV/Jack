const mongoose = require('mongoose');

/**
 * Event Schema — Core data model for the unified Event System.
 * Tracks all types of clan events, their participants, points, and final outcomes.
 */
const eventSchema = new mongoose.Schema({

  // Unique short ID for referencing in commands (e.g., "cb-001")
  eventId: {
    type: String,
    required: true,
    unique: true
  },

  // Type maps to a specific channel/role preset defined in eventManager.js
  type: {
    type: String,
    enum: ['clanBattle', 'intraMatch', 'foster', 'seasonal', 'fun'],
    required: true
  },

  name: {
    type: String,
    required: true
  },

  // The primary channel where results/leaderboards are posted
  channelId: {
    type: String,
    required: true
  },

  // The Discord Guild this event belongs to
  guildId: {
    type: String,
    required: true
  },

  // Discord user IDs of everyone who has at least 1 point recorded
  participants: {
    type: [String],
    default: []
  },

  // Map of discordId -> points (e.g., { "123456": 850 })
  points: {
    type: Map,
    of: Number,
    default: {}
  },

  // Sorted cached leaderboard: [{ discordId, points }]
  leaderboard: {
    type: [{ discordId: String, points: Number }],
    default: []
  },

  // Customizable reward slots (for clan battle: 6 prizes)
  rewards: {
    type: [{ rank: Number, label: String }],
    default: []
  },

  // Relevant Discord roles for this event type
  roles: {
    winnerRoleId: String,
    participantRoleId: String
  },

  // Scheduling info (optional manual metadata)
  startAt: {
    type: Date
  },
  endAt: {
    type: Date
  },

  // Lifecycle status
  status: {
    type: String,
    enum: ['upcoming', 'active', 'ended'],
    default: 'upcoming'
  },

  // Discord user who created the event
  createdBy: {
    type: String
  }

}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
