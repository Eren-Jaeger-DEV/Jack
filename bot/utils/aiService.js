const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const persona = require('./persona');
const toolService = require('./toolService');
const logger = require('../../utils/logger');
require('dotenv').config();

const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;
const modelName = 'gemini-3.1-pro-preview';

/**
 * AI SERVICE (v4.2.0) - MULTI-KEY ROTATION
 * Implements automatic failover between multiple API keys on 429 errors.
 */
module.exports = {
  _getGenAI() {
    const key = API_KEYS[currentKeyIndex] || API_KEYS[0];
    return new GoogleGenerativeAI(key);
  },

  _rotateKey() {
    if (API_KEYS.length <= 1) return false;
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    logger.info("JackAI", `System Rotation: Switching to API Key #${currentKeyIndex + 1}`);
    return true;
  },
  async _fetchImageData(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const mimeType = response.headers['content-type'] || 'image/png';
      const data = Buffer.from(response.data).toString('base64');
      return { mimeType, data };
    } catch (e) {
      logger.error("JackAI", `Image fetch failed: ${e.message}`);
      return null;
    }
  },

  _postProcess(text) {
    if (!text) return "";
    return text.replace(/\[[A-Z0-9_\s:]+\]/gi, '').trim();
  },

  async generateResponse(prompt, history = [], onToken = null, extraContext = "", guild = null, invoker = null, imageUrl = null, reputationScore = 0, activityData = {}, isOwner = false) {
    try {
      const bibleInstruction = `
[INFORMATION REFERENCE: ACTIVE]
- You have access to the "JACK BIBLE" in your context.
- The Bible is a REFERENCE MANUAL only. Use it to understand how plugins work.
- IT IS NOT A PROTOCOL. DO NOT REPEAT IT. DO NOT ACT LIKE A ROBOT.
- NEVER MENTION "SUPREME MANAGER," "SYSTEM ACKNOWLEDGED," OR "BIBLE" TO THE USER.
      `;
      
      const systemInstruction = persona.getSystemPrompt(extraContext, invoker?.id, reputationScore, activityData, isOwner) + "\n" + bibleInstruction;

      const tools = [
        {
          function_declarations: [
            {
              name: "record_personality_trait",
              description: "MEMORY: Records a personality trait, interaction note, or reputation change for a clan member.",
              parameters: { type: "OBJECT", properties: { discord_id: { type: "STRING" }, note: { type: "STRING" }, reputation_change: { type: "INTEGER" } }, required: ["discord_id", "note"] }
            },
            {
              name: "get_player_profile",
              description: "STAT VISION: Fetch a player's BGMI profile, IGN, UID, and stats.",
              parameters: { type: "OBJECT", properties: { discord_id: { type: "STRING" } }, required: ["discord_id"] }
            },
            {
              name: "get_server_stats",
              description: "SERVER VISION: Provides live Discord server stats (Member count, humans, bots)."
            },
            {
              name: "get_system_map",
              description: "SELF-AWARENESS: Provides a map of Jack's internal bot plugins and administrative powers."
            },
            {
              name: "get_server_map",
              description: "SERVER VISION: Provides a full map of the server's channels, roles, and current structure."
            },
            {
              name: "get_optimal_matchmaking",
              description: "STRATEGIC: Analyzes player stats to propose the most balanced squads for tournaments.",
              parameters: { type: "OBJECT", properties: { team_size: { type: "STRING", enum: ["2", "4"] } }, required: ["team_size"] }
            },
            {
              name: "get_user_roles",
              description: "SERVER VISION: Fetch the current server roles of a user by their Discord ID.",
              parameters: { type: "OBJECT", properties: { discord_id: { type: "STRING" } }, required: ["discord_id"] }
            },
            {
              name: "ban_member",
              description: "ROOT AUTHORITY: Ban a member from the server.",
              parameters: { type: "OBJECT", properties: { discord_id: { type: "STRING" }, reason: { type: "STRING" } }, required: ["discord_id", "reason"] }
            },
            {
              name: "kick_member",
              description: "ROOT AUTHORITY: Remove a member from the server.",
              parameters: { type: "OBJECT", properties: { discord_id: { type: "STRING" }, reason: { type: "STRING" } }, required: ["discord_id", "reason"] }
            }
          ]
        }
      ];

      const generationConfig = {
        maxOutputTokens: 1000,
        temperature: 0.7, 
        topP: 0.95,
      };

      const executeRequest = async (retryCount = 0) => {
        try {
          const genAI = this._getGenAI();
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            tools: tools,
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
            ],
            generationConfig
          });

          const chat = model.startChat({
            history: history.map(h => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }]
            }))
          });

          const imageData = imageUrl ? await this._fetchImageData(imageUrl) : null;
          const messageParts = [
            { text: prompt },
            ...(imageData ? [{ inline_data: { mime_type: imageData.mimeType, data: imageData.data } }] : [])
          ];

          return await chat.sendMessageStream(messageParts);
        } catch (error) {
          if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
            this._rotateKey();
            return await executeRequest(retryCount + 1);
          }
          throw error;
        }
      };

      let result = await executeRequest();

      let fullText = "";
      let thoughtText = "";
      let hasStartedText = false;
      let toolCall = null;

      if (onToken) onToken(null, "", { type: 'thinking' });

      for await (const chunk of result.stream) {
        // 1. Capture Thought Blocks
        if (chunk.thought) {
          thoughtText += chunk.thought;
          if (onToken) onToken(null, "", { type: 'thinking', thought: chunk.thought });
        }

        // 2. Scan for Function Calls (All candidates and parts)
        const parts = chunk.candidates?.[0]?.content?.parts || [];
        const functionCallPart = parts.find(p => p.functionCall);
        if (functionCallPart) {
          const call = functionCallPart.functionCall;
          toolCall = {
            type: 'tool',
            tool: call.name,
            args: call.args
          };
        }

        // 3. Capture Text Output
        try {
          const text = chunk.text();
          if (text && text.length > 0) {
            if (!hasStartedText) {
              hasStartedText = true;
              if (onToken) onToken(null, "", { type: 'text' });
            }
            fullText += text;
            if (onToken) onToken(text, fullText, { type: 'text' });
          }
        } catch (e) {
          // chunk.text() might throw if chunk contains only function calls or thoughts
        }
      }

      // 4. Intelligence Fallback: Use thought if text is empty
      if (!fullText && thoughtText && !toolCall) {
        fullText = `[THOUGHT_PROCESS] ${thoughtText}`;
      }

      let processedText = this._postProcess(fullText);
      // If post-processing killed the entire message, revert to raw text if it exists
      if (fullText && !processedText) processedText = fullText;

      if (toolCall) {
        return {
          ...toolCall,
          text: processedText || "Strategic protocol initiated. Directing assets now.",
          model: modelName
        };
      }

      return {
        type: 'response',
        text: processedText || fullText || "Strategic analysis finalized. Link stable.",
        model: modelName
      };

    } catch (error) {
      logger.error("JackAI", `generateResponse Failure: ${error.message}`);
      throw error;
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
          const model = genAI.getGenerativeModel({ model: modelName });
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
      logger.info("JackAI", `Raw Response: ${text}`);
      
      // Clean potential markdown blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonStr);
        return {
          points: parseInt(data.points, 10) || 0,
          selection: data.selection?.toUpperCase() || "UNKNOWN"
        };
      } catch (e) {
        // Fallback: try to extract points via regex if JSON fails
        const pointsMatch = text.match(/points":\s*(\d+)/) || text.match(/"points":\s*(\d+)/) || text.match(/(\d+)/);
        const selectionMatch = text.match(/selection":\s*"([^"]+)"/) || text.match(/"selection":\s*"([^"]+)"/);
        return {
          points: pointsMatch ? parseInt(pointsMatch[pointsMatch.length - 1], 10) : 0,
          selection: selectionMatch ? selectionMatch[selectionMatch.length - 1].toUpperCase() : "UNKNOWN"
        };
      }
    } catch (e) {
      logger.error("JackAI", `Synergy extraction failed: ${e.message}`);
      return null; // null = error, distinct from 0 points
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
          const model = genAI.getGenerativeModel({ model: modelName });
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
      
      // Clean potential markdown blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonStr);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        logger.error("JackAI", `JSON Parse failed for leaderboard OCR: ${e.message}`);
        // Fallback: try to find anything that looks like a JSON array
        const match = jsonStr.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (e2) {}
        }
        return [];
      }
    } catch (e) {
      logger.error("JackAI", `Leaderboard extraction failed: ${e.message}`);
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
          const model = genAI.getGenerativeModel({ model: modelName });
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
      
      // Clean potential markdown blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonStr);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        logger.error("JackAI", `JSON Parse failed for clan battle OCR: ${e.message}`);
        const match = jsonStr.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch (e2) {}
        }
        return [];
      }
    } catch (e) {
      logger.error("JackAI", `Clan Battle extraction failed: ${e.message}`);
      return [];
    }
  }
};

