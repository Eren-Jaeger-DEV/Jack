const mongoose = require('mongoose');

/**
 * MEMBER DIARY (Neural Memory)
 * Stores the personality profile, interactions, and 'Jack's Notes' on every member.
 * This is the AI's permanent memory of who the user 'is'.
 */
const MemberDiarySchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  nickname: { type: String },
  
  // PERSONALITY & REPUTATION
  personalityProfile: { type: String, default: "New User. Personality not yet analyzed." },
  reputationScore: { type: Number, default: 0 }, // -100 (Toxic) to +100 (Loyal)
  loyaltyStatus: { type: String, default: "Neutral" },
  
  // INTERACTION HISTORY
  lastInteraction: { type: Date, default: Date.now },
  interactionCount: { type: Number, default: 0 },
  
  // JACK'S SECRET NOTES
  notes: { type: String, default: "" },
  nicknameByJack: { type: String } // e.g. "The Noob", "The Sniper"
}, { timestamps: true });

module.exports = mongoose.model('MemberDiary', MemberDiarySchema);
