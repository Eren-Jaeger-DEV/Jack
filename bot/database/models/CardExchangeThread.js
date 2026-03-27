const mongoose = require("mongoose");

/**
 * CardExchangeThread Schema
 * 
 * Tracks private threads created for card exchanges.
 * Threads auto-expire and are deleted after 30 minutes.
 */
const cardExchangeThreadSchema = new mongoose.Schema({
  threadId: {
    type: String,
    required: true,
    unique: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CardExchange',
    required: true
  },
  posterId: {
    type: String,
    required: true
  },
  interestedId: {
    type: String,
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

module.exports = mongoose.model("CardExchangeThread", cardExchangeThreadSchema);
