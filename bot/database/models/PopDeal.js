const mongoose = require("mongoose");

const PopDealSchema = new mongoose.Schema({
  listingID: {
    type: String,
    required: true
  },
  sellerID: {
    type: String,
    required: true
  },
  buyerID: {
    type: String,
    required: true
  },
  channelID: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "ongoing", // 'ongoing', 'finalized', 'cancelled'
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("PopDeal", PopDealSchema);
