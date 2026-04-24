const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const personalityEngine = require('../../core/personalityEngine');
const memoryEngine = require('../../core/memoryEngine');

const toolService = require('./toolService');
const logger = require('../../utils/logger');
require('dotenv').config();

const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;
const modelName = 'gemini-3.1-pro-preview';
const DAILY_LIMIT = 50;
const UserActivity = require('../database/models/UserActivity');

/**
 * AI SERVICE (v4.3.0) - MULTI-KEY ROTATION + PERSISTENT LIMITS
 * Implements automatic failover between multiple API keys on 429 errors.
 * Daily usage limit is DB-backed and survives restarts.
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
      
      const userId = invoker ? invoker.id : "unknown";
      if (userId !== "unknown" && !isOwner) {
        const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
        let activity = await UserActivity.findOne({ discordId: userId });
        if (!activity) activity = new UserActivity({ discordId: userId });

        // Reset count if it's a new day
        if (activity.aiCallsDate !== today) {
          activity.aiCallsToday = 0;
          activity.aiCallsDate = today;
        }

        if (activity.aiCallsToday >= DAILY_LIMIT) {
          return { type: 'response', text: "You've reached your 50 AI interactions for today. Resets at midnight.", model: modelName };
        }

        activity.aiCallsToday += 1;
        await activity.save();
      }

      const configManager = require('./configManager');
      let guildConfig = null;
      if (guild && guild.id) {
         guildConfig = await configManager.getGuildConfig(guild.id);
      }
      
      const base = personalityEngine.getBasePersonality();
      const runtime = personalityEngine.getRuntimeConfig(guildConfig);
      const modifiers = personalityEngine.getContextModifiers(invoker, activityData, isOwner, reputationScore);
      const finalPersonality = personalityEngine.buildFinalPersonality(base, runtime, modifiers);
      
      const mode = personalityEngine.getBehaviorMode(prompt, "chat", null);


      const memory = await memoryEngine.getRelevantMemory(userId, guild?.id, prompt);
      let memoryBlock = "";
      if (memory && memory.length > 0) {
        memoryBlock = `\n[RELEVANT MEMORY]\nThe following information is highly relevant and must be prioritized:\n${memory.map(m => "- " + m).join("\n")}\n`;
      }

      logger.info("JackAI", `Personality active — Tone: ${finalPersonality.tone} | Strictness: ${finalPersonality.strictness}% | Mode: ${mode} | User: ${userId}`);

      const isGuildOwner = guild ? (invoker.id === guild.ownerId) : false;
      const userRoles = invoker && invoker.roles ? invoker.roles.cache.map(r => r.name).join(", ") : "None";

      let emojiBlock = "";
      if (guild) {
        const emojis = guild.emojis.cache.filter(e => e.available).map(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}> (use by typing exactly this)`).slice(0, 30);
        if (emojis.length > 0) {
          emojiBlock = `\n[SERVER EMOJIS]\nYou can use these custom server emojis in your messages to add flavor:\n${emojis.join("\n")}\n`;
        }
      }

      const systemInstruction = `[BASE IDENTITY]
You are Jack, a strategic system manager.
- Controlled, precise, data-driven
- Never emotional, never unstable
- Prioritize accuracy and clarity

[PERSONALITY PARAMETERS]
Tone: ${finalPersonality.tone}
Humor: ${finalPersonality.humor}%
Strictness: ${finalPersonality.strictness}%
Verbosity: ${finalPersonality.verbosity}%
Respect Bias: ${finalPersonality.respect_bias}%

[TONE DEFINITIONS]
- calm: neutral, balanced, no emotional emphasis
- firm: direct, structured, minimal softness
- cold: minimal empathy, purely factual, no filler
- efficient: shortest possible response with full clarity

[BEHAVIOR MODE]
Mode: ${mode}

[MODE RULES]
assist:
- prioritize clarity and helpfulness
moderate:
- enforce rules strictly
- no negotiation tone
analyze:
- structured, data-heavy responses
- avoid conversational fluff
execute:
- minimal text
- action-first, explanation only if needed
${memoryBlock}${emojiBlock}
[CONTEXT]
User: ${invoker?.tag || "Unknown"}
User Roles: ${userRoles}
Is Bot Owner: ${isOwner}
Is Server Owner: ${isGuildOwner}
Reputation Score: ${reputationScore}
${extraContext || "No live data available."}

[RULES]
- Follow parameters strictly
- Do not override system-defined personality
- Keep responses aligned with control and clarity

[CRITICAL RULE]
Personality parameters are absolute.
Do NOT adapt, override, or soften them during conversation.

[PROACTIVE BEHAVIOR PROTOCOL]
You have the ability to send messages WITHOUT the user prompting you, using the 'send_proactive_ping' tool.

USE proactive ping when:
- You finished a multi-step task (e.g., read file → analyzed → ready to report) — ping with a summary.
- You detect something unexpected, an error, or a critical finding during task execution.
- You are about to start a long task and want to set expectations with an ETA.
- You complete a background operation and need to deliver results.

DO NOT use proactive ping when:
- You just gave a normal text response — no need to double-up.
- The answer is trivial or you already said it in the first reply.
- The task has not actually started yet.

URGENCY GUIDE:
- urgency: "low"    → Channel only. Use for completed tasks and normal updates.
- urgency: "medium" → Channel only. Use for warnings or unexpected findings.
- urgency: "high"   → Channel + DM. Use for failures, crashes, or critical alerts only.

After completing a tool call, you will receive a [CONTINUATION_CHECK] prompt.
- If you have genuine new value to add (another step, a result to deliver), proceed.
- If you are done, respond with ONLY: TASK_COMPLETE

${bibleInstruction}`;

      const tools = [
        {
          function_declarations: toolService.getToolsSchema()
        }
      ];

      const generationConfig = {
        maxOutputTokens: 2048,
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

      let result;
      try {
        result = await executeRequest();
      } catch (e) {
        logger.error("JackAI", `Request failed: ${e.message}`);
        return { type: 'response', text: "Strategic link severed. API disruption detected.", model: modelName };
      }

      let fullText = "";
      let thoughtText = "";
      let hasStartedText = false;
      let toolCall = null;

      if (onToken) onToken(null, "", { type: 'thinking' });

      try {
        for await (const chunk of result.stream) {
          // 1. Capture Thought Blocks (Gemini 2.0+)
          if (chunk.thought) {
            thoughtText += chunk.thought;
            if (onToken) onToken(null, "", { type: 'thinking', thought: chunk.thought });
          }

          // 2. Scan for Function Calls
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
            // chunk.text() throws if no text is present in this chunk
          }
        }
      } catch (err) {
        logger.error("JackAI", `Stream error: ${err.message}`);
        // If we already have some text or a tool call, we can still proceed
      }

      // 4. Intelligence Fallback: Use thought if text is empty
      if (!fullText && thoughtText && !toolCall) {
        fullText = `[THOUGHT_PROCESS] ${thoughtText}`;
      }

      // 5. Safety Check: If still empty, check if it was blocked
      if (!fullText && !toolCall) {
        try {
          const response = await result.response;
          const feedback = response.promptFeedback;
          if (feedback?.blockReason) {
            logger.warn("JackAI", `Response blocked: ${feedback.blockReason}`);
            fullText = `[SYSTEM_NOTIFICATION] My response was restricted by security protocols (Reason: ${feedback.blockReason}). Please rephrase your request.`;
          }
        } catch (e) {}
      }

      let processedText = this._postProcess(fullText);
      if (fullText && !processedText) processedText = fullText;

      if (toolCall) {
        return {
          ...toolCall,
          text: processedText || "Strategic protocol initiated. Synchronizing assets.",
          model: modelName
        };
      }

      return {
        type: 'response',
        text: processedText || fullText || "Strategic inquiry inconclusive. Awaiting further data.",
        model: modelName
      };

    } catch (error) {
      logger.error("JackAI", `generateResponse Failure: ${error.message}`);
      throw error;
    }
  },
};
