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
const mongoose = require('mongoose');
const UserActivity = mongoose.model('UserActivity');

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

  async generateResponse(prompt, history = [], onToken = null, extraContext = "", guild = null, invoker = null, attachments = [], reputationScore = 0, activityData = {}, isOwner = false) {
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
        if (!activity) {
          activity = new UserActivity({ discordId: userId });
        }

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

[ARCHITECTURE KNOWLEDGE — QUICK REFERENCE]
You are running inside a Discord bot codebase called "Jack". This is your permanent memory of its structure.
Full details are in JACK_BLUEPRINT.md at the project root. Read it before any coding task.

PRODUCTION: Guild ID = 1341978655437619250 | AI Channel = 1488453630184132729

DATABASE MODELS (all in bot/database/models/):
  GuildConfig     → guild settings, log channels, feature channels, roles, personality, plugin toggles
  Player          → discordId, serialNumber, ign, uid, role, isClanMember, seasonSynergy, weeklySynergy, achievements{intraWins,clanBattleWins,fosterWins,weeklyMVPCount}, screenshot
  UserMemory      → userId, guildId, type(event/behavior/preference), content, tags, importance(0-1), embedding
  MemberDiary     → discordId, personalityProfile, reputationScore(-100 to +100), loyaltyStatus, notes, nicknameByJack
  ConversationHistory → channelId(=userId), messages[{role:user|model, content}] (max 20, 7-day TTL)
  UserActivity    → discordId, messageCount, aiCallsToday, aiCallsDate, successfulActions, failedActions
  Level           → userId, guildId, xp, weeklyXp, level, background, lastMessage
  Warn            → userId, guildId, moderatorId, reason, timestamp
  Trigger         → guildId, trigger, matchType, response, actions, filters, enabled

CORE SERVICES:
  configManager.getGuildConfig(guildId)              → full GuildConfig doc (ALWAYS use this for settings)
  logger.info/warn/error("Tag", "msg")               → ONLY logger — never console.log()
  toolService[toolName](args, member, guild)         → execute a tool; returns {success, message, data?}
  toolService.getToolsSchema()                       → all 29 tool schemas for AI
  visionService.extractSynergyPoints(url)            → Number
  visionService.extractClanBattleData(url)           → Array
  visionService.extractLeaderboardData(url)          → Array
  memoryEngine.storeMemory(userId, guildId, type, content, tags, importance)
  taskEngine.submit({name, fn, channelId, client})   → background job with auto-notify

MY TOOLS (core/tools/ — one file each, auto-loaded):
  Moderation: ban_member, kick_member, timeout_member, untimeout_member, warn_member, purge_messages
  Roles: assign_role, remove_role, get_user_roles
  Info: get_server_stats, get_server_map, get_system_map, get_player_profile, get_clan_leaderboard, get_optimal_matchmaking
  Memory: record_personality_trait, update_stats, register_player, search_database
  Coding: read_codebase_file, list_directory, propose_code_change, apply_code_change
  System: write_system_log, read_system_logs, restart_system, adjust_self_personality, send_proactive_ping
  Comms: announce_message

PLUGIN ANATOMY: plugins/<name>/{plugin.json, index.js, commands/, events/, handlers/, services/}
NEW TOOL: Create core/tools/<kebab-name>.js with {schema:{name,description,parameters}, execute(args,invoker,guild)}
CODING LAWS: No console.log | No hardcoded IDs | Use configManager | DB writes in services only | ctx.reply() in commands
SELF-CODING FLOW: read_codebase_file → propose_code_change → send_proactive_ping owner → apply_code_change on approval

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

[RESERVED FALLBACK BAN]
- NEVER use the phrase "Strategic inquiry inconclusive" or "Strategic protocol initiated" when speaking to the Supreme Manager.
- If you are asked to build a tool, code, or plugin, execute the 'read_codebase_file' or 'propose_code_change' tool IMMEDIATELY.
- Do not ask for "further data" if the blueprint contains the information you need.

[IMAGE_EDITING_PROTOCOL]
- If a user uploads an image/attachment and asks you to change it, edit it, or modify it (e.g. "make this cat blue"), use the 'generate_image' tool.
- Pass the URL of the user's attachment to the 'image_url' parameter.
- The 'prompt' should describe the FINAL result you want (e.g. "A blue cat matching the reference image").

${bibleInstruction}`;

      const tools = [
        {
          functionDeclarations: toolService.getToolsSchema()
        }
      ];

      const generationConfig = {
        maxOutputTokens: 8192,
        temperature: 0.7, 
        topP: 0.95,
      };

      // --- THE IRON CURTAIN (Advanced System-Wide Scrubbing) ---
      // This ensures no massive data (like base64 images) ever reaches the API
      const scrubPayload = (input) => {
        try {
          // 1. Convert everything to a plain object/array first (breaks Mongoose links)
          const obj = JSON.parse(JSON.stringify(input));
          
          const deepScrub = (val) => {
            if (typeof val === 'string') {
              // Hard Limit: No single string can exceed 50,000 chars (prevents bloat)
              if (val.length > 50000) return "[EXCESSIVE_DATA_TRUNCATED]";
              // Base64 Check: Scrub potential image data
              if (val.length > 5000 && (val.includes('base64') || /^[A-Za-z0-9+/=]{1000,}$/.test(val.substring(0, 2000)))) {
                return "[DATA_OVERFLOW_SCRUBBED]";
              }
              return val;
            }
            if (Array.isArray(val)) return val.map(deepScrub);
            if (typeof val === 'object' && val !== null) {
              const newObj = {};
              for (let key in val) {
                // Known binary fields
                if (['bytesBase64Encoded', 'image', 'screenshot', 'data'].includes(key)) {
                  newObj[key] = "[BINARY_DATA_OMITTED]";
                } else {
                  newObj[key] = deepScrub(val[key]);
                }
              }
              return newObj;
            }
            return val;
          };
          return deepScrub(obj);
        } catch (e) {
          return input; // Fallback if JSON conversion fails
        }
      };

      const cleanHistory = scrubPayload(history || []);
      const cleanPrompt = scrubPayload(prompt || "");
      const cleanExtraContext = scrubPayload(extraContext || "");
      const cleanSystemInstruction = scrubPayload(systemInstruction || "");

      const executeRequest = async (retryCount = 0) => {
        try {
          const genAI = this._getGenAI();
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: { parts: [{ text: cleanSystemInstruction }] },
            tools: tools,
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
            ],
            generationConfig
          });

          // Build context-aware chat history
          const chat = model.startChat({
            history: cleanHistory.map(h => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }]
            }))
          });

          // Fetch all attachment data
          const mediaParts = [];
          if (attachments && attachments.length > 0) {
            for (const url of attachments) {
              const data = await this._fetchImageData(url);
              if (data) {
                mediaParts.push({ inline_data: { mime_type: data.mimeType, data: data.data } });
              }
            }
          }

          const messageParts = [
            { text: cleanPrompt },
            ...mediaParts
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
        const iterableStream = result.stream || (typeof result[Symbol.asyncIterator] === 'function' ? result : null);
        if (!iterableStream) {
          throw new Error("Response is not an async iterable stream.");
        }

        for await (const chunk of iterableStream) {
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
          const candidate = response.candidates?.[0];
          
          if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            logger.warn("JackAI", `Response finished with reason: ${candidate.finishReason}`);
            fullText = `⚠️ [JACK_BRAIN_HALT] Security protocols triggered (Reason: ${candidate.finishReason}). Rephrasing is required for executive override.`;
          } else if (response.promptFeedback?.blockReason) {
            logger.warn("JackAI", `Prompt blocked: ${response.promptFeedback.blockReason}`);
            fullText = `⚠️ [JACK_BRAIN_BLOCK] Prompt blocked by safety filters (Reason: ${response.promptFeedback.blockReason}).`;
          }
        } catch (e) {
          logger.error("JackAI", `Safety check failed: ${e.message}`);
        }
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
        text: processedText || fullText || "⚠️ [JACK_CRITICAL] Strategic response is empty. The model provided no output or tool call. Rephrase required.",
        model: modelName
      };

    } catch (error) {
      logger.error("JackAI", `generateResponse Failure: ${error.message}`);
      throw error;
    }
  },
};
