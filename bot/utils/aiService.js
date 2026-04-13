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
      let hasStartedText = false;
      let toolCall = null;

      if (onToken) onToken(null, "", { type: 'thinking' });

      for await (const chunk of result.stream) {
        if (chunk.thought && !hasStartedText) {
          if (onToken) onToken(null, "", { type: 'thinking', thought: chunk.thought });
        }

        const functionCallPart = chunk.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
        if (functionCallPart) {
          const call = functionCallPart.functionCall;
          toolCall = {
            type: 'tool',
            tool: call.name,
            args: call.args
          };
        }

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
        } catch (e) {}
      }

      const processedText = this._postProcess(fullText);

      if (toolCall) {
        return {
          ...toolCall,
          text: processedText || "Strategic protocol initiated. Data acquisition in progress.",
          model: modelName
        };
      }

      return {
        type: 'response',
        text: processedText || fullText || "Strategic analysis complete. Report generated.",
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

      const prompt = "Analyze this BGMI 'All Data' stats card screenshot. Your goal is to extract the number for 'Team-up points earned'. \n\n" +
                     "Look specifically for the text 'Team-up points earned' and return ONLY the numeric value found next to or below it. \n" +
                     "If you see multiple numbers, provide the one associated with synergy or team-up points. \n" +
                     "Return ONLY the numerical digits (e.g., '450'). If no points are readable, return '0'.";
      
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
      const match = text.match(/\d+/);
      if (!match) return null; // null = unreadable, distinct from 0 points
      const points = parseInt(match[0], 10);
      return isNaN(points) ? null : points;
    } catch (e) {
      logger.error("JackAI", `Synergy extraction failed: ${e.message}`);
      return null; // null = error, distinct from 0 points
    }
  }
};
