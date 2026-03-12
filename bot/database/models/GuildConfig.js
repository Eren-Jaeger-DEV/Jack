const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String },
  adminGuideChannelId: { type: String },
  adminGuideMessageId: { type: String }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);