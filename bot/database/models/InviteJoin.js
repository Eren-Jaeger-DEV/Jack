const mongoose = require("mongoose");

const inviteJoinSchema = new mongoose.Schema({
  memberId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  inviterId: {
    type: String,
    required: true // Can be user ID, "vanity", or "unknown"
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for fast lookups
inviteJoinSchema.index({ memberId: 1, guildId: 1 });

module.exports = mongoose.model("InviteJoin", inviteJoinSchema);
