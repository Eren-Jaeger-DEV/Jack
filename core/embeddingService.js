/**
 * EMBEDDING SERVICE
 * Semantic memory embedding generator using Gemini text-embedding-004.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

function _getGenAI() {
  const key = API_KEYS[currentKeyIndex] || API_KEYS[0];
  return new GoogleGenerativeAI(key);
}

function _rotateKey() {
  if (API_KEYS.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`[EMBEDDING] Rotating API Key to index ${currentKeyIndex}`);
  return true;
}

async function getEmbedding(text, retryCount = 0) {
  if (!text || text.trim() === '') return [];

  try {
    const genAI = _getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
      _rotateKey();
      return await getEmbedding(text, retryCount + 1);
    }
    console.error("[EMBEDDING] Failed to generate embedding:", error.message);
    return [];
  }
}

module.exports = {
  getEmbedding
};
