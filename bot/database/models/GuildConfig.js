const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String },
  adminGuideChannelId: { type: String },
  adminGuideMessageId: { type: String },
  
  // Custom Controls
  prefix: { type: String, default: "j " },
  staffRoleId: { type: String },
  mvpRoleId: { type: String },

  // System Mappings
  channels: {
    general: { type: String, default: "1341978656096129065" },
    media: { type: String, default: "1341978656096129067" },
    links: { type: String, default: "1429740389731930162" },
    commands: { type: String, default: "1399825266360057917" },
    counting: { type: String }
  },

  roles: {
    owner: { type: String, default: "1407954932623347783" }, // Defaulting to specific role if found
    manager: { type: String },
    admin: { type: String },
    contributor: { type: String }
  },

  plugins: {
    type: Map,
    of: Boolean,
    default: {}
  },
  pluginSettings: {
    type: Map,
    of: Object,
    default: {}
  }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);