const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const logger = require('./logger');
require('dotenv').config();

const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

/**
 * VISION SERVICE
 * Handles purely visual tasks (OCR, Image Analysis) using Gemini Flash Models.
 */
module.exports = {
  _getGenAI() {
    const key = API_KEYS[currentKeyIndex] || API_KEYS[0];
    return new GoogleGenerativeAI(key);
  },

  _rotateKey() {
    if (API_KEYS.length <= 1) return false;
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    logger.info("VisionService", `System Rotation: Switching to API Key #${currentKeyIndex + 1}`);
    return true;
  },

  async _fetchImageData(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const mimeType = response.headers['content-type'] || 'image/png';
      const data = Buffer.from(response.data).toString('base64');
      return { mimeType, data };
    } catch (e) {
      logger.error("VisionService", `Image fetch failed: ${e.message}`);
      return null;
    }
  },

  async extractSynergyPoints(imageUrl) {
    if (!imageUrl) return 0;
    try {
      const imageData = await this._fetchImageData(imageUrl);
      if (!imageData) return 0;

      const prompt = "Analyze this BGMI 'All Data' stats card screenshot. Your goal is to extract TWO things:\n\n" +
                     "1. The 'Team-up points earned' (the big number on the right).\n" +
                     "2. The 'Selection' from the dropdown menu in the upper right (it will say 'ALL', 'SEASON 28', etc.).\n\n" +
                     "Look specifically for the text 'Team-up points earned' and return the numeric value.\n" +
                     "Then look at the dropdown box in the header and return what is selected.\n\n" +
                     "Return the result as a JSON object: { \"points\": number, \"selection\": \"string\" }.\n" +
                     "If no points are readable, return { \"points\": 0, \"selection\": \"unknown\" }.";
      
      const executeExtraction = async (retryCount = 0) => {
        try {
          const genAI = this._getGenAI();
          const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
          return await model.generateContent([
            { text: prompt },
            { inline_data: { mime_type: imageData.mimeType, data: imageData.data } }
          ]);
        } catch (error) {
          if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
            this._rotateKey();
            return await executeExtraction(retryCount + 1);
          }
          throw error;
        }
      };

      const result = await executeExtraction();

      const text = result.response.text().trim();
      logger.info("VisionService", `Raw Response: ${text}`);
      
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonStr);
        return {
          points: parseInt(data.points, 10) || 0,
          selection: data.selection?.toUpperCase() || "UNKNOWN"
        };
      } catch (e) {
        const pointsMatch = text.match(/points":\s*(\d+)/) || text.match(/"points":\s*(\d+)/) || text.match(/(\d+)/);
        const selectionMatch = text.match(/selection":\s*"([^"]+)"/) || text.match(/"selection":\s*"([^"]+)"/);
        return {
          points: pointsMatch ? parseInt(pointsMatch[pointsMatch.length - 1], 10) : 0,
          selection: selectionMatch ? selectionMatch[selectionMatch.length - 1].toUpperCase() : "UNKNOWN"
        };
      }
    } catch (e) {
      logger.error("VisionService", `Synergy extraction failed: ${e.message}`);
      return null;
    }
  },

  async extractLeaderboardData(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return [];
    try {
      const imagesData = await Promise.all(imageUrls.map(url => this._fetchImageData(url)));
      const validImages = imagesData.filter(Boolean);
      if (validImages.length === 0) return [];

      const prompt = `Analyze these ${validImages.length} clan leaderboard screenshots from a mobile game (e.g. PUBG/BGMI). 
Multiple screenshots might represent a scrolled list, so some members might appear more than once or overlap.

YOUR TASK:
1. Extract every unique member from the list.
2. For each member, identify their "Weekly Energy" and "Season Energy".
3. If a member appears multiple times with different values (unlikely if screenshots are sequential), pick the highest values.
4. Clean names of any leading/trailing status indicators like "Idle", "Online", or "Last online: ...". 
5. Return the data as a PURE JSON ARRAY of objects.

JSON Structure:
[
  { "name": "MEMBER_NAME", "weekly": number, "season": number }
]

CRITICAL: Return ONLY the JSON array. Do not include markdown code blocks or any other text.`;
      
      const executeExtraction = async (retryCount = 0) => {
        try {
          const genAI = this._getGenAI();
          const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
          const parts = [
            { text: prompt },
            ...validImages.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.data } }))
          ];
          return await model.generateContent(parts);
        } catch (error) {
          if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
            this._rotateKey();
            return await executeExtraction(retryCount + 1);
          }
          throw error;
        }
      };

      const result = await executeExtraction();
      const text = result.response.text().trim();
      
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonStr);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        logger.error("VisionService", `JSON Parse failed for leaderboard OCR: ${e.message}`);
        const match = jsonStr.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          try { return JSON.parse(match[0]); } catch (e2) {}
        }
        return [];
      }
    } catch (e) {
      logger.error("VisionService", `Leaderboard extraction failed: ${e.message}`);
      return [];
    }
  },

  async extractClanBattleData(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return [];
    try {
      const imagesData = await Promise.all(imageUrls.map(url => this._fetchImageData(url)));
      const validImages = imagesData.filter(Boolean);
      if (validImages.length === 0) return [];

      const prompt = `Analyze these ${validImages.length} "Contribution Point Rankings" screenshots from a clan battle in BGMI/PUBG Mobile.
Multiple screenshots might represent a scrolled list, so some members might appear more than once or overlap.

YOUR TASK:
1. Extract every unique member from the list.
2. For each member, identify their "Today's Points" and "Total Points".
3. If a member appears multiple times, pick the entry with the highest "Total Points".
4. Return the data as a PURE JSON ARRAY of objects.

JSON Structure:
[
  { "name": "MEMBER_NAME", "today": number, "total": number }
]

CRITICAL: Return ONLY the JSON array. Do not include markdown code blocks or any other text.`;
      
      const executeExtraction = async (retryCount = 0) => {
        try {
          const genAI = this._getGenAI();
          const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
          const parts = [
            { text: prompt },
            ...validImages.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.data } }))
          ];
          return await model.generateContent(parts);
        } catch (error) {
          if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
            this._rotateKey();
            return await executeExtraction(retryCount + 1);
          }
          throw error;
        }
      };

      const result = await executeExtraction();
      const text = result.response.text().trim();
      
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonStr);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        logger.error("VisionService", `JSON Parse failed for clan battle OCR: ${e.message}`);
        const match = jsonStr.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          try { return JSON.parse(match[0]); } catch (e2) {}
        }
        return [];
      }
    } catch (e) {
      logger.error("VisionService", `Clan Battle extraction failed: ${e.message}`);
      return [];
    }
  }
};
