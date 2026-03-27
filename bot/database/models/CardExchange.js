const mongoose = require("mongoose");

/**
 * CardExchange Schema
 * 
 * Tracks active card exchange posts that are pending and should auto-expire.
 */
const cardExchangeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  channelId: {
    type: String,
    required: true
  },
  wantedCard: {
    type: String,
    required: true
  },
  offeredCards: {
    type: [String],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("CardExchange", cardExchangeSchema);
