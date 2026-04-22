/**
 * PAYMENT ANALYZER
 * Analyzes payment screenshots using Gemini Vision.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
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
  console.log(`[PAYMENT ANALYZER] Rotating API Key to index ${currentKeyIndex}`);
  return true;
}

async function _fetchImageData(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    const data = Buffer.from(response.data).toString('base64');
    return { mimeType, data };
  } catch (e) {
    console.error("[PAYMENT ANALYZER] Image fetch failed:", e.message);
    return null;
  }
}

async function analyzePayment(imageUrl, userMessage, retryCount = 0) {
  if (!imageUrl) return { status: "unclear", reason: "No image provided." };

  const imageData = await _fetchImageData(imageUrl);
  if (!imageData) return { status: "unclear", reason: "Failed to download image." };

  const prompt = `Analyze this payment screenshot and extract:

Return JSON:
{
  "status": "verified | suspicious | unclear",
  "amount": number or null,
  "currency": "INR" or null,
  "transactionId": "string or null",
  "confidence": 0-1,
  "reason": "short explanation"
}

User Context Message: "${userMessage || ""}"

Rules:
- Only mark 'verified' if payment success is clearly visible
- If uncertain, return 'unclear'
- Be strict and conservative`;

  try {
    const genAI = _getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-pro-preview",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: imageData.mimeType, data: imageData.data } }
    ]);

    const text = result.response.text().trim();
    const data = JSON.parse(text);
    
    console.log("[PAYMENT ANALYSIS]", {
      status: data.status,
      confidence: data.confidence
    });
    
    return data;
  } catch (error) {
    if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
      _rotateKey();
      return await analyzePayment(imageUrl, userMessage, retryCount + 1);
    }
    console.error("[PAYMENT ANALYZER] Analysis failed:", error.message);
    return { status: "unclear", reason: "OCR/Vision API failed." };
  }
}

module.exports = {
  analyzePayment
};
