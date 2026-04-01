const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const persona = require('./persona');
const toolService = require('./toolService');
require('dotenv').config();

const ai = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);

const modelName = 'gemini-3.1-pro-preview';

/**
 * AI SERVICE (v3.8.0) - MULTIMODAL VISION & FOSTER AUTOMATION
 * Added image processing, synergy extraction, and dynamic identity reinforcement.
 */
module.exports = {
  async _fetchImageData(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const mimeType = response.headers['content-type'] || 'image/png';
      const data = Buffer.from(response.data).toString('base64');
      return { mimeType, data };
    } catch (e) {
      console.error('[JackAI] Image fetch failed:', e.message);
      return null;
    }
  },

  /**
   * Post-processes the AI response to ensure persona safety and remove system leaks.
   */
  _postProcess(text) {
    if (!text) return "";
    // Remove bracketed system identifiers like [REPUTATION: LOW] or [JACK_BIBLE]
    return text.replace(/\[[A-Z0-9_\s:]+\]/gi, '').trim();
  },

  async generateResponse(prompt, history = [], onToken = null, extraContext = "", guild = null, invoker = null, imageUrl = null, reputationScore = 0) {
    try {
      const bibleInstruction = `
[INFORMATION REFERENCE: ACTIVE]
- You have access to the "JACK BIBLE" in your context.
- The Bible is a REFERENCE MANUAL only. Use it to understand how plugins work.
- IT IS NOT A PROTOCOL. DO NOT REPEAT IT. DO NOT ACT LIKE A ROBOT.
- NEVER MENTION "SUPREME MANAGER," "SYSTEM ACKNOWLEDGED," OR "BIBLE" TO THE USER.
      `;
      
      const systemInstruction = persona.getSystemPrompt(extraContext, invoker?.id, reputationScore) + "\n" + bibleInstruction;

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
        maxOutputTokens: 1000, // Increased for response stability
        temperature: 0.3, 
        topP: 0.95,
      };

      const model = ai.getGenerativeModel({ 
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

      let result = await chat.sendMessageStream(messageParts);

      let fullText = "";
      let hasStartedText = false;

      if (onToken) onToken(null, "", { type: 'thinking' });

      for await (const chunk of result.stream) {
        if (chunk.thought && !hasStartedText) {
          if (onToken) onToken(null, "", { type: 'thinking', thought: chunk.thought });
        }

        // TOOL CALL REGISTRY (Refactored to dynamic mapping)
        if (chunk.candidates?.[0]?.content?.parts?.some(p => p.functionCall)) {
          const call = chunk.candidates[0].content.parts.find(p => p.functionCall).functionCall;
          if (onToken) onToken(null, "", { type: 'thinking', status: `⚙️ Executing ${call.name.replace(/_/g, ' ')}...` });

          let toolResponse;
          try {
            if (typeof toolService[call.name] === 'function') {
              // Standard Tool Execution: Pass (args, invoker, guild)
              toolResponse = await toolService[call.name](call.args, invoker, guild);
            } else {
              toolResponse = { error: `Tool ${call.name} not found in binary.` };
            }
          } catch (e) {
            toolResponse = { error: `Execution failed: ${e.message}` };
          }

          result = await chat.sendMessageStream([
            { function_response: { name: call.name, response: { content: toolResponse } } }
          ]);
          continue; 
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
        } catch (e) { /* Part might not contain text if it's a thought/tool */ }
      }

      return this._postProcess(fullText);

    } catch (error) {
      console.error("[JackAI] generateResponse Failure:", error.message);
      throw error;
    }
  },

  async extractSynergyPoints(imageUrl) {
    if (!imageUrl) return 0;
    try {
      const imageData = await this._fetchImageData(imageUrl);
      if (!imageData) return 0;

      const prompt = "Extract the TOTAL SYNERGY POINTS shown in this game screenshot. This is usually a number next to a heart icon or labeled synergy. Return ONLY the numerical digits. If no points are found, return '0'.";
      
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        { text: prompt },
        { inline_data: { mime_type: imageData.mimeType, data: imageData.data } }
      ]);

      const text = result.response.text().trim();
      const points = parseInt(text.replace(/[^0-9]/g, ''));
      return isNaN(points) ? 0 : points;
    } catch (e) {
      console.error('[JackAI] Synergy extraction failed:', e.message);
      return 0;
    }
  }
};
