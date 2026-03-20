const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String },
  adminGuideChannelId: { type: String },
  adminGuideMessageId: { type: String },
  plugins: {
    admin: { type: Boolean, default: true },
    clan: { type: Boolean, default: true },
    emoji: { type: Boolean, default: true },
    fun: { type: Boolean, default: true },
    leveling: { type: Boolean, default: true },
    market: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    packs: { type: Boolean, default: true },
    roles: { type: Boolean, default: true },
    sticker: { type: Boolean, default: true },
    utility: { type: Boolean, default: true },
    'intra-match': { type: Boolean, default: true },
    'clan-battle': { type: Boolean, default: true },
    'seasonal-synergy': { type: Boolean, default: true },
    'member-classification': { type: Boolean, default: true },
    'foster-program': { type: Boolean, default: true }
  },
  pluginSettings: {
    type: Map,
    of: Object,
    default: {}
  }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);