const mongoose = require('mongoose');

const pendingSubmissionSchema = new mongoose.Schema({
  pairIndex:     { type: Number, required: true },
  userId:        { type: String, required: true },
  value:         { type: Number, required: true },
  type:          { type: String, enum: ['initial', 'final'], required: true }, // Bug 1 fix: was missing
  screenshotUrl: { type: String, default: '' },
  timestamp:     { type: Date, default: Date.now }
}, { _id: false });

const pairSchema = new mongoose.Schema({
  mentorId:      { type: String, required: true },
  partnerId:     { type: String, required: true },
  points:        { type: Number, default: 0 },
  initialPoints: { type: Number, default: 0 } // Baseline for current rotation
}, { _id: false });

const fosterProgramSchema = new mongoose.Schema({
  guildId:              { type: String, required: true },
  active:               { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['REGISTRATION', 'ACTIVE', 'ENDED'], 
    default: 'ACTIVE' 
  },
  
  // REGISTRATION (Phase 0)
  registration: {
    mentorThreadId:   { type: String },
    neophyteThreadId: { type: String },
    veteranThreadId:  { type: String },
    
    registeredMentors:   { type: [String], default: [] },
    registeredNeophytes: { type: [String], default: [] },
    registeredVeterans:  { type: [String], default: [] },
    
    mentorPoolSize:      { type: Number, default: 15 },
    lastPoolExpansion:   { type: Date, default: Date.now },
    expiresAt:           { type: Date }
  },

  term:                 { type: Number, default: 1 },       // 1 or 2 (15 days each)
  cycle:                { type: Number, default: 1 },       // 1, 2, 3 (5-day shuffles per term)
  phase:                { type: Number, default: 1 },       
  rotationIndex:        { type: Number, default: 0 },       
  startedAt:            { type: Date, default: Date.now },
  lastRotation:         { type: Date, default: Date.now },
  leaderboardMessageId: { type: String, default: null },
  submissionThreadId:   { type: String, default: null },   // Dedicated thread for stat cards
  
  // Point Attribution (Individual rankings)
  mentorPoints:         { type: Map, of: Number, default: {} },
  newbiePoints:         { type: Map, of: Number, default: {} },

  pairs:                { type: [pairSchema], default: [] },
  pendingSubmissions:   { type: [pendingSubmissionSchema], default: [] },
  submittedThisCycle:   { type: [String], default: [] }      
});

module.exports = mongoose.model('FosterProgram', fosterProgramSchema);
