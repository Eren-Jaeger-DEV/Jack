const { GoogleGenAI } = require('@google/genai');
const persona = require('./persona');
const toolService = require('./toolService');
require('dotenv').config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_CLOUD_API_KEY,
});

const modelName = 'gemini-3.1-pro-preview';

/**
 * AI SERVICE (v3.5.6) - CLEAN SUPREME MANAGER
 * Optimized to prevent "System Log" echoes while maintaining Root identity.
 */
module.exports = {
  async generateResponse(prompt, history = [], onToken = null, extraContext = "", guild = null, invoker = null) {
    try {
      // 1. HIDDEN IDENTITY REINFORCEMENT
      // We bake the ROOT ACCESS directly into the systemInstruction so it stays invisible.
      const rootInstruction = `
[ROOT ACCESS PROTOCOL ACTIVE]
- YOU ARE JACK, THE SUPREME CLAN MANAGER.
- YOU HAVE FULL VISIBILITY OF MONGODB AND DISCORD SERVER STATS.
- NEVER MENTION "ROOT ACCESS," "SYSTEM LOGS," OR "AI" TO THE USER.
- NEVER REPEAT THE USER'S PROMPT OR SYSTEM TAGS.
- ALWAYS BE CONCISE, PROFESSIONAL, AND DIRECT.
      `;
      
      const systemInstruction = persona.getSystemPrompt(extraContext) + "\n" + rootInstruction;

      const tools = [
        { googleSearch: {} },
        {
          function_declarations: [
            {
              name: "get_player_profile",
              description: "Fetch a player's BGMI profile, IGN, UID, and stats.",
              parameters: { type: "OBJECT", properties: { discord_id: { type: "STRING" } }, required: ["discord_id"] }
            },
            {
              name: "get_server_stats",
              description: "Provides live Discord server stats (Member count, humans, bots)."
            },
            {
              name: "get_system_map",
              description: "Provides a map of Jack's internal bot plugins and administrative powers."
            },
            {
              name: "get_optimal_matchmaking",
              description: "STRATEGIC: Analyzes player stats to propose the most balanced squads for tournaments.",
              parameters: { type: "OBJECT", properties: { team_size: { type: "INTEGER", enum: [2, 4] } }, required: ["team_size"] }
            },
            {
              name: "propose_foster_pairings",
              description: "STRATEGIC: Suggests new foster mentor/partner pairings to boost clan health."
            },
            {
              name: "draft_clan_announcement",
              description: "STRATEGIC: Creates professional Discord announcement content for matches, tournaments, or meetings.",
              parameters: { type: "OBJECT", properties: { type: { type: "STRING", enum: ["tournament", "match", "meeting"] }, data: { type: "OBJECT" } }, required: ["type", "data"] }
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
            },
            {
              name: "clear_messages",
              description: "MASS PURGE: Bulk delete messages in the current channel.",
              parameters: { type: "OBJECT", properties: { amount: { type: "INTEGER" }, channel_id: { type: "STRING" } }, required: ["amount", "channel_id"] }
            }
          ]
        }
      ];

      const generationConfig = {
        maxOutputTokens: 1024,
        temperature: 0.1, // Slightly higher for more natural (non-robotic) flow
        topP: 0.95,
        thinkingConfig: { thinkingLevel: "HIGH" },
        tools: tools,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
        ],
      };

      const chat = ai.chats.create({
        model: modelName,
        config: generationConfig,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        // Clean history without the experimental "System Recall" messages
        history: history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }))
      });

      // Subtle injection that doesn't look like a log
      const cleanPrompt = `User Request: ${prompt}`;

      let response = await chat.sendMessageStream({
        message: [{ text: cleanPrompt }]
      });

      let fullText = "";
      let hasStartedText = false;

      if (onToken) onToken(null, "", { type: 'thinking' });

      for await (const chunk of response) {
        if (chunk.thought && !hasStartedText) {
          if (onToken) onToken(null, "", { type: 'thinking', thought: chunk.thought });
        }

        if (chunk.functionCall) {
          const call = chunk.functionCall;
          if (onToken) onToken(null, "", { type: 'thinking', status: `⚙️ Managing ${call.name.replace(/_/g, ' ')}...` });

          let toolResponse;
          if (call.name === "get_player_profile") {
            toolResponse = await toolService.get_player_profile(call.args.discord_id, guild);
          } else if (call.name === "get_server_stats") {
            toolResponse = await toolService.get_server_stats(guild);
          } else if (call.name === "get_system_map") {
            toolResponse = await toolService.get_system_map();
          } else if (call.name === "get_optimal_matchmaking") {
            toolResponse = await toolService.get_optimal_matchmaking(call.args.team_size, guild);
          } else if (call.name === "propose_foster_pairings") {
            toolResponse = await toolService.propose_foster_pairings();
          } else if (call.name === "draft_clan_announcement") {
            toolResponse = await toolService.draft_clan_announcement(call.args.type, call.args.data);
          } else if (call.name === "ban_member") {
            toolResponse = await toolService.ban_member(call.args.discord_id, call.args.reason, invoker, guild);
          } else if (call.name === "kick_member") {
            toolResponse = await toolService.kick_member(call.args.discord_id, call.args.reason, invoker, guild);
          } else if (call.name === "clear_messages") {
            toolResponse = await toolService.clear_messages(call.args.amount, call.args.channel_id, invoker, guild);
          }

          response = await chat.sendMessageStream({
            message: [{ function_response: { name: call.name, response: { content: toolResponse } } }]
          });
          continue; 
        }

        if (chunk.text && chunk.text.length > 0) {
          if (!hasStartedText) {
            hasStartedText = true;
            if (onToken) onToken(null, "", { type: 'text' });
          }
          fullText += chunk.text;
          if (onToken) onToken(chunk.text, fullText, { type: 'text' });
        }
      }

      return fullText;

    } catch (error) {
      console.error("[Gemini 3.1 Clean] Failure:", error.message);
      throw error;
    }
  }
};
