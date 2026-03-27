const mongoose = require("mongoose");

/**
 * Card Schema
 * 
 * category - The thread name where the card resides
 * name     - The card name (unique within a category)
 * rarity   - Card rarity (S, A, B, C, etc.)
 * image    - URL to the card image (Discord attachment)
 */
const cardSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  rarity: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  }
}, { 
  timestamps: true 
});

// Composite index to prevent duplicates within a category and speed up lookups
cardSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("Card", cardSchema);
