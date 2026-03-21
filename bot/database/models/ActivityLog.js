const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  adminId: { type: String, required: true },
  adminUsername: String,
  adminAvatar: String,
  action: { type: String, required: true },
  targetId: { type: String, required: true },
  targetUsername: String,
  targetAvatar: String,
  changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
