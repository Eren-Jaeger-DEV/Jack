const mongoose = require('mongoose');

const intraRegistrationSchema = new mongoose.Schema({

  guildId: { type: String, required: true },

  threadId: { type: String, required: true },

  announceMessageId: { type: String },

  active: { type: Boolean, default: true },

  endTime: { type: Date, default: null },

  participants: [{
    discordId: String,
    ign: String,
    registeredAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }

});

module.exports = mongoose.model('IntraRegistration', intraRegistrationSchema);
