const mongoose = require('mongoose');

const pendingSubmissionSchema = new mongoose.Schema({
  pairIndex:     { type: Number, required: true },
  userId:        { type: String, required: true },
  value:         { type: Number, required: true },
  type:          { type: String, enum: ['initial', 'final'], default: 'initial' },
  screenshotUrl: { type: String, default: '' },
  timestamp:     { type: Date, default: Date.now }
}, { _id: false });

const targetSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  role:      { type: String, enum: ['MENTOR', 'NEOPHYTE', 'VETERAN'], required: true },
  invitedAt: { type: Date, default: Date.now },
  status:    { type: String, enum: ['invited', 'declined', 'registered'], default: 'invited' }
}, { _id: false });

const pairSchema = new mongoose.Schema({
  mentorId:      { type: String, required: true },
  partnerId:     { type: String, required: true },
  points:        { type: Number, default: 0 },
  initialPoints: { type: Number, default: 0 }
}, { _id: false });

const fosterProgramSchema = new mongoose.Schema({
  guildId:              { type: String, required: true },
  active:               { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['REGISTRATION', 'PAIRING_VERIFICATION', 'ACTIVE', 'VERIFICATION_FINAL', 'ENDED'], 
    default: 'REGISTRATION' 
  },
  
  registration: {
    mentorThreadId:   { type: String },
    neophyteThreadId: { type: String },
    veteranThreadId:  { type: String },
    
    targets:          { type: [targetSchema], default: [] },
    
    registeredMentors:   { type: [String], default: [] },
    registeredNeophytes: { type: [String], default: [] },
    registeredVeterans:  { type: [String], default: [] },
    
    expiresAt:           { type: Date },
    lastPoolRotation:    { type: Date, default: Date.now } // For veteran 6h/mentor 24h rotations
  },

  term:                 { type: Number, default: 1 },       // 1-2
  cycle:                { type: Number, default: 1 },       // 1-3
  startedAt:            { type: Date, default: Date.now },
  lastRotation:         { type: Date, default: Date.now },
  leaderboardMessageId: { type: String, default: null },
  submissionThreadId:   { type: String, default: null },
  lastReminderAt:       { type: Date },                     // Hourly pings for verification
  
  // Point Attribution
  mentorPoints:         { type: Map, of: Number, default: {} },
  partnerPoints:        { type: Map, of: Number, default: {} },

  pairs:                { type: [pairSchema], default: [] },
  previousPairs:        { type: [[String]], default: [] },   // To ensure unique shuffles [[uid1, uid2], ...]
  pendingSubmissions:   { type: [pendingSubmissionSchema], default: [] },
  submittedThisCycle:   { type: [String], default: [] }      
});

module.exports = mongoose.model('FosterProgram', fosterProgramSchema);
