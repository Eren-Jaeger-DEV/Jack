/**
 * utils/cardManager.js
 *
 * Shared card utility used by both card-database and card-exchange plugins.
 * Now backed by MongoDB instead of a JSON file.
 */

'use strict';

const Card = require('../bot/database/models/Card');

/**
 * Returns a flat { category: ["Card Name", ...] } map for the exchange dropdown UI.
 * @returns {Promise<Record<string, string[]>>}
 */
async function getCards() {
  try {
    const cards = await Card.find({}).lean();
    const flat = {};
    for (const card of cards) {
      if (!flat[card.category]) flat[card.category] = [];
      flat[card.category].push(card.name);
    }
    return flat;
  } catch (err) {
    console.error('[CardManager] getCards error:', err.message);
    return {};
  }
}

/**
 * Returns the full list of cards from the database.
 * @returns {Promise<Array>}
 */
async function getCache() {
  try {
    return await Card.find({}).lean();
  } catch (err) {
    console.error('[CardManager] getCache error:', err.message);
    return [];
  }
}

/**
 * Returns rarity for a given card name, or null if not found.
 * @param {string} cardName
 * @returns {Promise<string|null>}
 */
async function getCardRarity(cardName) {
  try {
    const card = await Card.findOne({ name: { $regex: new RegExp(`^${cardName}$`, 'i') } }).lean();
    return card ? card.rarity : null;
  } catch (err) {
    console.error('[CardManager] getCardRarity error:', err.message);
    return null;
  }
}

/**
 * Returns the image URL for a given card name, or null if not found.
 * @param {string} cardName
 * @returns {Promise<string|null>}
 */
async function getCardImage(cardName) {
  try {
    const card = await Card.findOne({ name: { $regex: new RegExp(`^${cardName}$`, 'i') } }).lean();
    return card ? card.image : null;
  } catch (err) {
    console.error('[CardManager] getCardImage error:', err.message);
    return null;
  }
}

/**
 * saveCards is now deprecated for MongoDB. 
 * Use direct model operations in syncHandler instead.
 */
function saveCards() {
  console.warn('[CardManager] saveCards() is deprecated for MongoDB migration.');
}

module.exports = { getCache, getCards, getCardRarity, getCardImage, saveCards };
