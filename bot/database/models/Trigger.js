const mongoose = require('mongoose');

const triggerSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  trigger: { type: String, required: true },
  matchType: {
    type: String,
    enum: ['substring', 'strict', 'startswith', 'endswith', 'exact', 'regex'],
    default: 'substring'
  },
  response: { type: String },
  actions: {
    addRoles: [{ type: String }],
    removeRoles: [{ type: String }],
    deleteTriggeringMessage: { type: Boolean, default: false },
    dmResponse: { type: Boolean, default: false }
  },
  filters: {
    allowedChannels: [{ type: String }],
    ignoredChannels: [{ type: String }],
    allowedRoles: [{ type: String }],
    ignoredRoles: [{ type: String }]
  },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Trigger', triggerSchema);
