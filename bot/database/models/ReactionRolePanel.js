const mongoose = require("mongoose");

const ReactionRolePanelSchema = new mongoose.Schema({
  panelID: {
    type: String,
    required: true,
    unique: true
  },
  guildID: {
    type: String,
    required: true
  },
  channelID: {
    type: String,
    required: true
  },
  messageID: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: "#000000"
  },
  roles: [
    {
      roleID: String,
      emoji: String,
      label: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ReactionRolePanel", ReactionRolePanelSchema);
