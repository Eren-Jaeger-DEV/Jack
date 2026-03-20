const mongoose = require('mongoose');

const pendingSubmissionSchema = new mongoose.Schema({
  pairIndex:     { type: Number, required: true },
  userId:        { type: String, required: true },
  value:         { type: Number, required: true },
  screenshotUrl: { type: String, required: true },
  timestamp:     { type: Date, default: Date.now }
}, { _id: false });

const pairSchema = new mongoose.Schema({
  mentorId:  { type: String, required: true },
  partnerId: { type: String, required: true },
  points:    { type: Number, default: 0 }
}, { _id: false });

const fosterProgramSchema = new mongoose.Schema({
  guildId:              { type: String, required: true },
  active:               { type: Boolean, default: true },
  phase:                { type: Number, default: 1 },       // 1 or 2
  rotationIndex:        { type: Number, default: 0 },       // 0, 1, 2
  startedAt:            { type: Date, default: Date.now },
  lastRotation:         { type: Date, default: Date.now },
  leaderboardMessageId: { type: String, default: null },
  pairs:                { type: [pairSchema], default: [] },
  pendingSubmissions:   { type: [pendingSubmissionSchema], default: [] },
  submittedThisCycle:   { type: [String], default: [] }      // userIds who submitted this rotation cycle
});

module.exports = mongoose.model('FosterProgram', fosterProgramSchema);
