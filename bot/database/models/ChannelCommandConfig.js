const mongoose = require("mongoose");

const schema = new mongoose.Schema({

  guildId: String,
  channelId: String, // "all" = server wide
  category: String

});

module.exports = mongoose.model("ChannelCommandConfig", schema);