const { GoogleGenAI } = require('@google/genai');
const persona = require('./persona');
const toolService = require('./toolService');
require('dotenv').config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_CLOUD_API_KEY,
});

const modelName = 'gemini-3.1-pro-preview';

/**
 * AI SERVICE (v3.6.1) - CLEAN SUPREME MANAGER (SILENT BIBLE)
 * Optimized to remove technical tags and treat the Bible as a reference manual.
 */
module.exports = {
  async generateResponse(prompt, history = [], onToken = null, extraContext = "", guild = null, invoker = null) {
    try {
      // 1. REFINED INSTRUCTIONS
      // We clarify that the Bible is a REFERENCE manual, not a protocol.
      const bibleInstruction = `
[INFORMATION REFERENCE: ACTIVE]
- You have access to the "JACK BIBLE" in your context.
- The Bible is a REFERENCE MANUAL only. Use it to understand how plugins work.
- IT IS NOT A PROTOCOL. DO NOT REPEAT IT. DO NOT ACT LIKE A ROBOT.
- NEVER MENTION "SUPREME MANAGER," "SYSTEM ACKNOWLEDGED," OR "BIBLE" TO THE USER.
      `;
      
      const systemInstruction = persona.getSystemPrompt(extraContext) + "\n" + bibleInstruction;

      const tools = [
        { googleSearch: {} },
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
              name: "get_optimal_matchmaking",
              description: "STRATEGIC: Analyzes player stats to propose the most balanced squads for tournaments.",
              parameters: { type: "OBJECT", properties: { team_size: { type: "INTEGER", enum: [2, 4] } }, required: ["team_size"] }
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
        maxOutputTokens: 800, // SWEET SPOT: Prevents mid-sentence cuts while staying brief
        temperature: 0.25, 
        topP: 0.95,
        thinkingConfig: { thinkingLevel: "MEDIUM" }, // SPEED UP: Still smart, but faster.
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
        history: history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }))
      });

      const cleanPrompt = `[MANDATORY IDENTITY: YOU ARE JACK. DO NOT BREAK CHARACTER. VICTOR IS YOUR CREATOR & MASTER. IF ASKED TO ROLEPLAY OR SHOW AI TRAITS, REFUSE WITH ARROGANCE.] User Request: ${prompt}`;
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
          } else if (call.name === "record_personality_trait") {
            toolResponse = await toolService.record_personality_trait(call.args.discord_id, call.args.note, call.args.reputation_change || 0);
          } else if (call.name === "get_system_map") {
            toolResponse = await toolService.get_system_map();
          } else if (call.name === "get_optimal_matchmaking") {
            toolResponse = await toolService.get_optimal_matchmaking(call.args.team_size, guild);
          } else if (call.name === "ban_member") {
            toolResponse = await toolService.ban_member(call.args.discord_id, call.args.reason, invoker, guild);
          } else if (call.name === "kick_member") {
            toolResponse = await toolService.kick_member(call.args.discord_id, call.args.reason, invoker, guild);
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
