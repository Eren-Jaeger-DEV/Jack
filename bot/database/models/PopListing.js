const mongoose = require("mongoose");

const PopListingSchema = new mongoose.Schema({
  listingID: {
    type: String,
    required: true,
    unique: true
  },
  sellerID: {
    type: String,
    required: true
  },
  sellerName: {
    type: String,
    required: true
  },
  popAmount: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: "active", // 'active', 'pending', 'completed', 'cancelled'
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("PopListing", PopListingSchema);
