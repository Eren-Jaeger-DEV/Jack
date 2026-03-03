const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  moderatorId: String,
  reason: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Warn', warnSchema);