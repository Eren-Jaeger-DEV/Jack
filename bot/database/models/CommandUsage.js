const mongoose = require("mongoose");

const CommandUsageSchema = new mongoose.Schema(
  {
    commandName: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    userID: {
      type: String,
      required: true,
      index: true
    },
    guildID: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    collection: "command_usage"
  }
);

CommandUsageSchema.index({ commandName: 1, timestamp: -1 });
CommandUsageSchema.index({ guildID: 1, timestamp: -1 });

module.exports = mongoose.model("CommandUsage", CommandUsageSchema);
