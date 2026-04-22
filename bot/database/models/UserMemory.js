const mongoose = require('mongoose');

const userMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  type: { type: String, required: true, enum: ["event", "behavior", "preference"] },
  content: { type: String, required: true },
  tags: { type: [String], default: [] },
  importance: { type: Number, min: 0, max: 1, default: 0.5 },
  embedding: { type: [Number], required: false },
  createdAt: { type: Date, default: Date.now }
});

userMemorySchema.index({ userId: 1, guildId: 1 });
userMemorySchema.index({ importance: -1, createdAt: -1 });

module.exports = mongoose.model('UserMemory', userMemorySchema);
