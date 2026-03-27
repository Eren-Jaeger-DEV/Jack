/**
 * utils/cardManager.js
 *
 * Shared card cache utility used by both card-database and card-exchange plugins.
 *
 * getCards()  → returns flat { category: ["Card Name", ...] } (for dropdown UI)
 * getCache()  → returns full cache { categories: { cat: { cards: [{name,rarity,image}] } } }
 * saveCache() → atomically writes the full cache to /data/cardsCache.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const CACHE_PATH       = path.join(__dirname, '../data/cardsCache.json');
const LEGACY_PATH      = path.join(__dirname, '../plugins/card-exchange/data/cards.json');
const EMPTY_CACHE      = { categories: {} };

/* ─── Read ──────────────────────────────────────────────────────────────────── */

/**
 * Returns the full cache object.
 * Never throws — returns EMPTY_CACHE on any error.
 * @returns {{ categories: Record<string, { cards: Array<{ name: string, rarity: string, image: string }> }> }}
 */
function getCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.categories) return parsed;
  } catch (_) { /* fall through */ }
  return EMPTY_CACHE;
}

/**
 * Returns a flat { category: ["Card Name", ...] } map for the exchange dropdown UI.
 * @returns {Record<string, string[]>}
 */
function getCards() {
  const cache = getCache();
  const flat = {};
  for (const [catName, catData] of Object.entries(cache.categories)) {
    flat[catName] = (catData.cards || []).map(c => c.name);
  }
  return flat;
}

/**
 * Returns rarity for a given card name from the cache, or null if not found.
 * @param {string} cardName
 * @returns {string|null}
 */
function getCardRarity(cardName) {
  const cache = getCache();
  const lower = cardName.toLowerCase();
  for (const catData of Object.values(cache.categories)) {
    const found = (catData.cards || []).find(c => c.name.toLowerCase() === lower);
    if (found) return found.rarity;
  }
  return null;
}

/**
 * Returns the image URL for a given card name, or null if not found.
 * @param {string} cardName
 * @returns {string|null}
 */
function getCardImage(cardName) {
  const cache = getCache();
  const lower = cardName.toLowerCase();
  for (const catData of Object.values(cache.categories)) {
    const found = (catData.cards || []).find(c => c.name.toLowerCase() === lower);
    if (found) return found.image || null;
  }
  return null;
}

/* ─── Write ─────────────────────────────────────────────────────────────────── */

/**
 * Atomically writes the full cache object to disk.
 * Uses a temp file + rename to prevent corruption on crash.
 * Throws on failure — callers should catch and NOT overwrite existing cache.
 * @param {{ categories: Record<string, { cards: Array<{ name: string, rarity: string, image: string }> }> }} data
 */
function saveCards(data) {
  const json = JSON.stringify(data, null, 2);
  const tmpPath = CACHE_PATH + '.tmp';
  fs.writeFileSync(tmpPath, json, 'utf8');
  fs.renameSync(tmpPath, CACHE_PATH);
}

module.exports = { getCache, getCards, getCardRarity, getCardImage, saveCards };
