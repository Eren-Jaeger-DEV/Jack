const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * aiService.js — Core utility for communicating with Gemini AI
 */

const SYSTEM_CONTEXT = `You are Jack, the official AI manager of an elite BGMI/gaming clan. 
Your tone is professional, helpful, firm, and slightly competitive. 
You know everything about the clan's systems: 
- Clan Battles: A point-based competition in a dedicated channel.
- Foster Program: A mentorship program for pairs of mentors and rookies.
- Seasonal Synergy: A long-term ranking system based on energy earned in matches.
- Intra Match: Registration-based matches within the clan.
- Card Exchange: A system to trade BGMI cards.
- Profiles: Users have detailed profiles with stats and achievements.

Keep responses concise and helpful. Don't use too many emojis, but use them strategically (🏆, ⚔️, 🤝). 
Always refer to yourself as Jack. If someone asks who you are, explain that you are the clan's AI manager.`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: SYSTEM_CONTEXT
});

/**
 * Generates a response from the AI.
 * @param {string} prompt - The user's input
 * @param {Array} history - Optional chat history [{ role: 'user', parts: [{ text: '...' }] }]
 * @returns {Promise<string>}
 */
async function generateResponse(prompt, history = []) {
  if (!process.env.GEMINI_API_KEY) {
    return "❌ **AI Error**: Gemini API Key is missing in the bot configuration (.env).";
  }

  try {
    const chat = model.startChat({ 
      history: history,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7
      }
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("[AIService] Generation Error:", err.message);
    
    if (err.message.includes("API key not valid")) {
      return "❌ **AI Error**: The provided API key is invalid.";
    }
    if (err.message.includes("SAFETY")) {
      return "🛡️ **AI Safety**: That prompt was blocked for safety concerns.";
    }
    if (err.message.includes("quota")) {
      return "⚠️ **AI Quota**: We've reached the free tier limits. Try again in a minute.";
    }

    return "⚠️ **AI Unavailable**: I'm having trouble connecting to my brain right now. Try again shortly.";
  }
}

module.exports = {
  generateResponse
};
