const { Collection } = require("discord.js");
const perms = require("../bot/utils/permissionUtils");
const { getClanContext } = require("../bot/utils/clanContext");
const ConversationHistory = require("../bot/database/models/ConversationHistory");
const UserActivity = require("../bot/database/models/UserActivity");
const aiValidator = require("./aiValidator");
const toolService = require("../bot/utils/toolService");
const aiService = require("../bot/utils/aiService");
const observer = require("./observer");
const { addLog } = require("../utils/logger");

// Max number of autonomous continuation passes Jack can do before we force-stop.
// Prevents infinite loops and channel spam.
const MAX_CONTINUATION_PASSES = 5;

const channelLocks = new Map();
// NOTE: 3-second in-memory cooldown is intentional — persisting to DB would add
// a round-trip latency to every message check, which defeats the purpose of rate limiting.
const userCooldowns = new Map();
const lastMessages = new Map();

const GENERIC_WORDS = ["hi", "ok", "hello", "jack", "hey", "yo", "yes", "no"];
const MIN_WORDS = 2;
const COOLDOWN_MS = 3000;

/**
 * AI CONTROLLER (v2.2.0) - Adaptive Decision Edition + DM Support
 * Implements intent classification, validation, and feedback loop.
 * Owner-only DM channel supported via processDM().
 */
module.exports = {
  
  async shouldProcess(message, client) {
    if (message.author.bot || !message.guild) return false;

    // 1. Strict Channel ID Lock (Zero Leakage)
    if (message.channel.id !== "1488453630184132729") return false;

    // 2. Summoning Checks
    const content = message.content.trim();
    const lowerContent = content.toLowerCase();
    
    const startsWithJack = lowerContent.startsWith("jack");
    const isMentioned = message.mentions.has(client.user.id);

    let isReplyToBot = false;
    if (message.reference && message.reference.messageId) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg && repliedMsg.author.id === client.user.id) {
          isReplyToBot = true;
        }
      } catch (err) {}
    }

    const isSummoned = startsWithJack || isMentioned || isReplyToBot;
    if (!isSummoned) return false;

    // 3. Rate Limiting & Quality Filter
    const userId = message.author.id;
    const bypass = perms.hasFullBypass(message.member);

    // Cooldown Check
    if (!bypass && userCooldowns.has(userId)) {
      const remaining = COOLDOWN_MS - (Date.now() - userCooldowns.get(userId));
      if (remaining > 0) {
        addLog("AIController", `Filtered: Cooldown active for ${message.author.tag} (${remaining}ms)`);
        return false;
      }
    }

    // Meaningful Input Check (Full Bypass)
    if (!bypass) {
      const quality = _isMeaningfulMessage(content, userId);
      if (!quality.valid) {
        addLog("AIController", `Filtered: ${quality.reason} from ${message.author.tag}`);
        return false;
      }
    }

    // 4. State Update
    userCooldowns.set(userId, Date.now());
    lastMessages.set(userId, lowerContent);
    
    addLog("AIController", `Accepted: Processing input from ${message.author.tag}`);
    return true;
  },

  /**
   * DM PIPELINE — Owner-Only Private Channel
   * Runs full AI with memory + history. Tools that need guild return a graceful message.
   * No summoning keyword required — every DM from the owner is processed.
   */
  async processDM(message, client) {
    const userId = message.author.id;
    const dmChannel = message.channel;
    const content = message.content.trim();

    if (!content) return;

    // Lock per-user to prevent parallel DM responses
    if (channelLocks.has(userId)) return;
    channelLocks.set(userId, true);

    try {
      await dmChannel.sendTyping().catch(() => {});

      // Build a synthetic context object — DMs have no guild/member
      // For Owner DMs, we grant ALL permissions (has: () => true)
      const syntheticMember = {
        id: userId,
        user: message.author,
        roles: { cache: new Collection() },
        permissions: { has: () => true } // DM Super-User
      };

      // --- VISION: Gather Attachments ---
      const attachments = message.attachments.map(a => a.url);

      // --- CONTEXT: Handle Replies ---
      let replyContext = "";
      if (message.reference) {
        try {
          const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
          replyContext = `\n[REPLY_CONTEXT] User is replying to ${repliedMsg.author.tag}: "${repliedMsg.content}"\n`;
        } catch (e) {}
      }

      const { context: extraContext, reputationScore } = await getClanContext(null, syntheticMember);
      const history = await this._getHistory(userId);
      const activityData = await UserActivity.findOne({ discordId: userId }) || {};

      const dmContext = `[DM MODE: Supreme Manager Link Active. You have FULL permissions. Tools are enabled.]\n${replyContext}${extraContext}`;

      const decision = await aiService.generateResponse(
        content, history, null, dmContext,
        null, syntheticMember, attachments, reputationScore, activityData, true
      );

      // Log decision concisely
      addLog("AIController", `[DM] ${decision.type}${decision.tool ? ' (' + decision.tool + ')' : ''}`);

      let responseText;

      if (decision.type === 'tool') {
        try {
          const enrichedArgs = { ...decision.args, _client: client };
          const result = await toolService[decision.tool]?.(enrichedArgs, syntheticMember, null);
          
          if (result) {
            // Handle Rich Media (Embeds/Files) from tools in DMs
            if (result.embeds || result.files) {
              await dmChannel.send({ embeds: result.embeds, files: result.files }).catch(() => {});
            }

            // --- HARD STOP FOR IMAGES ---
            // Image generation is a terminal action. We skip interpretation to prevent
            // context bloat crashes and infinite loops.
            if (decision.tool === 'generate_image' && result.success) {
              addLog("AIController", "[DM] Image generated successfully. Ending cycle to prevent loop.");
              await this._updateHistory(userId, content, `[SYSTEM] Image generated successfully for prompt: ${JSON.stringify(enrichedArgs.prompt)}`);
              return;
            }

            // SCRUBBER: Omit massive binary data from AI interpretation
            const scrubbedResult = { ...result };
            if (scrubbedResult.bytesBase64Encoded) scrubbedResult.bytesBase64Encoded = "[IMAGE_DATA_OMITTED]";
            if (scrubbedResult.image) scrubbedResult.image = "[IMAGE_DATA_OMITTED]";

            const feedbackPrompt = `[TOOL_RESULT: ${decision.tool}] ${JSON.stringify(scrubbedResult)}
${(result && (result.error || result.status === 'error' || (typeof result === 'string' && result.includes("not found")))) ? "\n[STRICT_WARNING] This tool call FAILED. Do not attempt the exact same call again. Check your paths and try a different strategy." : ""}`;
            
            const interpretation = await aiService.generateResponse(
              feedbackPrompt, history, null, dmContext,
              null, syntheticMember, null, reputationScore, activityData, true
            );
            responseText = this._extractFinalText(interpretation.text);
            
            await this._runContinuationLoop({
              history, extraContext: dmContext, guild: null,
              member: syntheticMember, reputationScore, activityData,
              isOwner: true, client,
              notifyFn: async (text) => await dmChannel.send(text).catch(() => {}),
              userId
            });
          }
        } catch (toolErr) {
          responseText = `⚠️ Tool \`${decision.tool}\` error: ${toolErr.message}`;
        }
      } else {
        responseText = this._extractFinalText(decision.text);
      }

      if (responseText) {
        await dmChannel.send(responseText).catch(() => {});
        await this._updateHistory(userId, content, responseText);
      }

    } catch (err) {
      addLog("AIController", `[DM] Pipeline Failure: ${err.message}`);
      await dmChannel.send("Something went wrong. Try again.").catch(() => {});
    } finally {
      channelLocks.delete(userId);
    }
  },

  async process(context, client, overrideContent = null) {
    const isInteraction = !!context.isCommand;
    const channelId = context.channelId || context.channel.id;
    const content = overrideContent || context.content || context.options?.getString("prompt");

    if (channelLocks.has(channelId)) return true;
    channelLocks.set(channelId, true);

    try {
      if (!isInteraction) await context.channel.sendTyping().catch(() => {});

      // 1. Context Preparation
      const member = context.member;
      const guild = context.guild;
      const userId = member.id;
      const isOwner = perms.isOwner(member);

      const { context: extraContext, reputationScore } = await getClanContext(guild, member);
      // History is keyed by userId (not channelId) so each user gets their own
      // conversation thread — prevents mixing messages from different users.
      let history = await this._getHistory(userId);

      // 2. AI Execution
      addLog("AIController", `Adaptive Engine: Analyzing ${context.user?.tag || context.author?.tag} (Owner: ${isOwner})`);
      
      if (isInteraction) {
        if (!context.deferred && !context.replied) await context.deferReply().catch(() => {});
        if (!isOwner) streamingMessage = await context.editReply("⚡ **Jack is analyzing intent...**").catch(() => null);
        else streamingMessage = { edit: async () => {}, isOwnerStub: true }; 
      } else {
        if (!isOwner) streamingMessage = await context.reply("⚡ **Jack is analyzing intent...**").catch(() => null);
        else streamingMessage = { edit: async () => {}, isOwnerStub: true };
      }

      if (!streamingMessage && !isOwner) throw new Error("Failed to send initial reply.");

      // Fetch User Activity for persona adaptation
      const activityData = await UserActivity.findOne({ discordId: userId }) || {};

      // --- VISION: Gather Attachments ---
      const attachments = message.attachments.map(a => a.url);

      // --- CONTEXT: Handle Replies ---
      let replyContext = "";
      if (message.reference) {
        try {
          const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
          replyContext = `\n[REPLY_CONTEXT] User is replying to ${repliedMsg.author.tag}: "${repliedMsg.content}"\n`;
        } catch (e) {}
      }

      const decision = await aiService.generateResponse(
        content,
        history,
        null, 
        replyContext + (extraContext || ""),
        guild,
        member,
        attachments,
        reputationScore,
        activityData,
        isOwner
      );

      // 3. Execution Pipeline (Security Unification)
      addLog("AIController", `${isOwner ? '[MASTER_OVERRIDE] ' : ''}[MODEL: ${decision.model}] Decision Type: ${decision.type} | Target: ${decision.tool || 'Text'}`);
 
      if (decision.type === "tool") {
        const bypass = perms.hasFullBypass(member);
        const validation = await aiValidator.validateAction(decision, member, guild, bypass);
        
        if (validation.valid) {
          if (bypass) addLog("AIController", `[BYPASS_ACTIVE] Executing ${decision.tool} for Staff/Owner`);
          else addLog("AIController", `Executing ${decision.tool} with args: ${JSON.stringify(decision.args)}`);
          
          // PHASE: Real Execution
          const execMsg = `⚙️ **Jack is executing ${decision.tool.replace(/_/g, " ")}...**`;
          if (!isOwner) {
            if (isInteraction) await context.editReply(execMsg).catch(() => {});
            else await streamingMessage.edit(execMsg).catch(() => {});
          }

          // Inject client so tools like send_proactive_ping can reach Discord
          const enrichedArgs = { ...decision.args, _client: client };
          const result = await toolService[decision.tool](enrichedArgs, member, guild);
          
          if (result.success) {
             await observer.recordActionSuccess(member.id, decision.tool);
                          // UPDATE HISTORY with the call so the Interpretation Pass has context
              await this._updateHistory(userId, content, `[AI_CALL: ${decision.tool}]`);

              // --- HARD STOP FOR IMAGES ---
              if (decision.tool === 'generate_image' && result.success) {
                addLog("AIController", "Image generated successfully. Ending cycle to prevent loop.");
                await this._updateHistory(userId, content, `[SYSTEM] Image generated successfully for prompt: ${JSON.stringify(enrichedArgs.prompt)}`);
                await notifyFn("🎨 I've generated that image for you.");
                return;
              }

              // PHASE: Interpretation Pass (Self-Awareness)
             const feedbackPrompt = `[TOOL_RESULT: ${decision.tool}] ${JSON.stringify(result)}`;
             
             const interpretation = await aiService.generateResponse(
                feedbackPrompt, history, null, extraContext,
                guild, member, null, reputationScore, activityData, isOwner
             );

             // Handle Rich Media (Embeds/Files) from tools
             if (result.embeds || result.files) {
               if (isInteraction) await context.editReply({ embeds: result.embeds, files: result.files }).catch(() => {});
               else if (streamingMessage.isOwnerStub) await context.channel.send({ embeds: result.embeds, files: result.files }).catch(() => {});
               else await streamingMessage.edit({ content: "✅ **Action completed.**", embeds: result.embeds, files: result.files }).catch(() => {});
             }

             const responseText = this._extractFinalText(interpretation.text);
             addLog("AIController", `Interpretation Pass Processed: ${responseText.substring(0, 50)}...`);
             
             if (isInteraction) {
                // If we already sent an embed, we should send the text as a follow-up or separate message
                if (result.embeds || result.files) await context.followUp(responseText).catch(() => {});
                else await context.editReply(responseText).catch(() => {});
             } else if (streamingMessage.isOwnerStub) {
                await context.reply(responseText).catch(() => {});
             } else {
                if (result.embeds || result.files) await context.channel.send(responseText).catch(() => {});
                else await streamingMessage.edit(responseText).catch(() => {});
             }
             
             await this._updateHistory(userId, content, responseText);

             // --- CONTINUATION LOOP ---
             // After the interpretation pass, let Jack decide if he has more to do.
             // This is what allows him to proactively send follow-up messages.
             const replyChannel = context.channel || null;
             await this._runContinuationLoop({
               history, extraContext, guild, member,
               reputationScore, activityData, isOwner, client,
               notifyFn: async (text) => {
                 if (replyChannel) await replyChannel.send(text).catch(() => {});
               },
               userId
             });

          } else {
             await observer.recordActionFailure(member.id, decision.tool);
             const errorText = `❌ **Action Failed**: ${result.message}`;
             if (isInteraction) await context.editReply(errorText).catch(() => {});
             else if (streamingMessage.isOwnerStub) await context.reply(errorText).catch(() => {});
             else await streamingMessage.edit(errorText).catch(() => {});
             
             await this._updateHistory(userId, content, `[ACTION_FAILURE: ${decision.tool}] ${result.message}`);
          }
        } else {
          addLog("AIController", `Security Denied: ${validation.reason}`);
          await observer.recordActionFailure(member.id, decision.tool);
          // SMART FALLBACK: Permission Denied
          const deniedText = `❌ **Access Denied**: ${validation.reason}`;
          if (isInteraction) await context.editReply(deniedText).catch(() => {});
          else if (streamingMessage.isOwnerStub) await context.reply(deniedText).catch(() => {});
          else await streamingMessage.edit(deniedText).catch(() => {});
        }
      } else {
        // Normal Text Response with SMART FALLBACK
        addLog("AIController", `Text Response Raw: ${decision.text.substring(0, 50)}...`);
        const responseText = this._extractFinalText(decision.text);
        addLog("AIController", `Text Response Processed: ${responseText.substring(0, 50)}...`);

        if (isInteraction) await context.editReply(responseText).catch(() => {});
        else if (streamingMessage.isOwnerStub) await context.reply(responseText).catch(() => {});
        else await streamingMessage.edit(responseText).catch(() => {});
        await this._updateHistory(userId, content, responseText);
      }

      return true;

    } catch (err) {
      addLog("AIController", `Pipeline Failure: ${err.message}`);
      // REQUISITE: Respond calmly and clearly during failure
      const fallback = "Couldn't complete that. Try again.";
      if (isInteraction) await context.editReply(fallback).catch(() => {});
      else if (context.channel) await context.channel.send(fallback).catch(() => {});
      return false; 
    } finally {
      channelLocks.delete(channelId);
    }
  },

  /**
   * CONTINUATION LOOP — Autonomous Multi-Step Processing
   *
   * After completing a tool, this checks if Jack wants to keep working autonomously.
   * It prompts him once per pass. If he calls a tool, we execute it and continue.
   * If he calls send_proactive_ping or returns TASK_COMPLETE, we stop.
   * Hard cap: MAX_CONTINUATION_PASSES iterations to prevent infinite loops.
   *
   * @param {object} opts
   * @param {Array}    opts.history
   * @param {string}   opts.extraContext
   * @param {object}   opts.guild
   * @param {object}   opts.member
   * @param {number}   opts.reputationScore
   * @param {object}   opts.activityData
   * @param {boolean}  opts.isOwner
   * @param {object}   opts.client         — Discord.js Client
   * @param {Function} opts.notifyFn       — async (text) => sends message to the right place
   * @param {string}   opts.userId
   */
  async _runContinuationLoop({ history, extraContext, guild, member, reputationScore, activityData, isOwner, client, notifyFn, userId }) {
    const CONTINUATION_PROMPT = `[CONTINUATION_CHECK]
You just completed a task or action. Review what you have done so far.
- If you have more steps to execute (e.g., another tool to call, results to report), proceed with the next action now.
- If you want to send a proactive update or notify the Supreme Manager, call the 'send_proactive_ping' tool.
- If you are fully done and have nothing more to add, respond with ONLY the text: TASK_COMPLETE
Do NOT repeat what you already said. Only proceed if there is genuine new value to add.`;

    // Known generic AI fallback strings — never send these proactively, they are noise.
    const GENERIC_FALLBACKS = new Set([
      "strategic inquiry inconclusive. awaiting further data.",
      "strategic protocol initiated. synchronizing assets.",
      "synchronizing strategic link...",
      "strategic inquiry incomplete. data stream unstable.",
      "couldn't complete that. try again.",
    ]);
    const _isFallback = (text) => GENERIC_FALLBACKS.has(text.toLowerCase().trim());

    for (let pass = 0; pass < MAX_CONTINUATION_PASSES; pass++) {
      addLog("AIController", `[ContinuationLoop] Pass ${pass + 1}/${MAX_CONTINUATION_PASSES} for user ${userId}`);

      let continuationDecision;
      try {
        continuationDecision = await aiService.generateResponse(
          CONTINUATION_PROMPT, history, null, extraContext,
          guild, member, null, reputationScore, activityData, isOwner
        );
      } catch (e) {
        addLog("AIController", `[ContinuationLoop] AI call failed on pass ${pass + 1}: ${e.message}`);
        break;
      }

      // --- STOP CONDITION: Jack says he's done ---
      if (continuationDecision.type === 'response') {
        const text = continuationDecision.text?.trim() || "";
        if (text === "TASK_COMPLETE" || text.toUpperCase().includes("TASK_COMPLETE")) {
          addLog("AIController", `[ContinuationLoop] Jack declared TASK_COMPLETE on pass ${pass + 1}.`);
          break;
        }
        // He has something to say — only send if it's not a known generic fallback
        const finalText = this._extractFinalText(text);
        if (finalText && finalText.length > 10 && !_isFallback(finalText)) {
          addLog("AIController", `[ContinuationLoop] Jack sending proactive text on pass ${pass + 1}.`);
          await notifyFn(finalText);
          await this._updateHistory(userId, CONTINUATION_PROMPT, finalText);
        } else {
          addLog("AIController", `[ContinuationLoop] Suppressed fallback/empty text on pass ${pass + 1}. Stopping.`);
        }
        break;
      }

      // --- TOOL CALL: Jack wants to do more work ---
      if (continuationDecision.type === 'tool') {
        const toolName = continuationDecision.tool;
        addLog("AIController", `[ContinuationLoop] Jack calling tool '${toolName}' on pass ${pass + 1}.`);

        if (!toolService[toolName]) {
          addLog("AIController", `[ContinuationLoop] Unknown tool: ${toolName}. Stopping.`);
          break;
        }

        let toolResult;
        try {
          const enrichedArgs = { ...continuationDecision.args, _client: client };
          toolResult = await toolService[toolName](enrichedArgs, member, guild);
        } catch (e) {
          addLog("AIController", `[ContinuationLoop] Tool '${toolName}' threw: ${e.message}`);
          break;
        }

        // SCRUBBER: Prevent massive binary data from bloating context
        const scrubbedResult = { ...toolResult };
        if (scrubbedResult.bytesBase64Encoded) scrubbedResult.bytesBase64Encoded = "[IMAGE_DATA_OMITTED]";
        if (scrubbedResult.image) scrubbedResult.image = "[IMAGE_DATA_OMITTED]";

        // Record this in history so Jack knows what happened
        await this._updateHistory(userId, CONTINUATION_PROMPT, `[AI_CALL: ${toolName}] Result: ${JSON.stringify(scrubbedResult)}`);

        // Interpretation pass for this continuation tool call
        const isFailure = toolResult && (toolResult.error || toolResult.status === 'error' || (typeof toolResult === 'string' && toolResult.includes("not found")));
        
        const feedbackPrompt = `[TOOL_RESULT: ${toolName}] ${JSON.stringify(scrubbedResult)}
${isFailure ? "\n[STRICT_WARNING] This tool call FAILED. Do not attempt the exact same call again. Check your paths and try a different strategy." : ""}`;
        
        let interp;
        try {
          interp = await aiService.generateResponse(
            feedbackPrompt, history, null, extraContext,
            guild, member, null, reputationScore, activityData, isOwner
          );
        } catch (e) { break; }

        const interpText = this._extractFinalText(interp.text);
        if (interpText && interpText.length > 10
            && !interpText.toUpperCase().includes("TASK_COMPLETE")
            && !_isFallback(interpText)) {
          await notifyFn(interpText);
          await this._updateHistory(userId, feedbackPrompt, interpText);
        } else {
          addLog("AIController", `[ContinuationLoop] Suppressed fallback text after tool '${toolName}' on pass ${pass + 1}.`);
        }

        // If Jack called send_proactive_ping, the message is already sent by the tool — stop here.
        if (toolName === 'send_proactive_ping') {
          addLog("AIController", `[ContinuationLoop] Proactive ping sent. Loop complete.`);
          break;
        }

        // Continue to next pass
        continue;
      }

      // Unknown decision type — stop
      break;
    }
  },

  /**
   * ZERO-REPAIR POLICY: Ensures internal JSON never reaches the user.
   */
  _extractFinalText(rawText) {
    const DEFAULT_FALLBACK = "Strategic inquiry incomplete. Data stream unstable.";
    const THINKING_MESSAGE = "Synchronizing strategic link...";
    if (!rawText) return DEFAULT_FALLBACK;
    
    // 1. Aggressive Markdown Cleanup
    let clean = rawText.trim()
      .replace(/```[a-z]*\n?/gi, "") 
      .replace(/```/g, "")
      .trim();

    // 2. Detection: Is this a JSON payload? (Lenient check)
    const isJsonLikely = clean.includes('{') && (clean.includes('"text"') || clean.includes('"intent"'));

    if (isJsonLikely) {
      // 1. Try Structured Regex (Closed JSON)
      const structuredMatch = clean.match(/"text"\s*:\s*"([\s\S]*?)"(?=\s*\}|\s*,)/i);
      if (structuredMatch && structuredMatch[1]) {
        return structuredMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .trim();
      }

      // 2. Try Aggressive Recovery (Partial/Open JSON)
      // Look for the LAST occurrence of "text":"
      const textKey = '"text":';
      const lastIndex = clean.lastIndexOf(textKey);
      if (lastIndex !== -1) {
        let extracted = clean.substring(lastIndex + textKey.length).trim();
        // Remove leading quote
        if (extracted.startsWith('"') || extracted.startsWith("'")) {
          extracted = extracted.substring(1);
        }
        // Remove trailing quote/brace if present
        extracted = extracted.replace(/"\s*\}?$/i, "");
        extracted = extracted.replace(/,\s*"[a-z]+"\s*:[\s\S]*$/i, ""); // Strip subsequent keys
        
        return extracted
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .trim();
      }

      // 3. Full Parse as backup
      try {
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.text) return parsed.text;
        }
      } catch (e) {
        if (clean.startsWith('{')) return THINKING_MESSAGE;
      }
    }
    
    // 3. Fallback for raw text responses
    if (clean === "{" || clean === "}") return THINKING_MESSAGE;
    
    // Remove potential stray markers (e.g., [REPORT])
    const finalClean = clean
      .replace(/^[\[|\(][A-Z\s_]+[\]|\)]\s*/i, "") 
      .trim();

    return finalClean || clean || DEFAULT_FALLBACK;
  },

  async _getHistory(userId) {
    try {
      const historyDoc = await ConversationHistory.findOne({ channelId: userId });
      if (!historyDoc) return [];
      return historyDoc.messages.map(m => ({ 
        role: m.role === 'model' ? 'assistant' : 'user', 
        content: m.content 
      }));
    } catch (e) { return []; }
  },

  async _updateHistory(userId, userPrompt, aiResponse) {
    try {
      let history = await ConversationHistory.findOne({ channelId: userId });
      if (!history) history = new ConversationHistory({ channelId: userId, messages: [] });
      history.messages.push({ role: 'user', content: userPrompt }, { role: 'model', content: aiResponse });
      if (history.messages.length > 20) history.messages.splice(0, 2);
      await history.save();
    } catch (e) {}
  }
};

/**
 * Smart Filter Internal Utility
 */
function _isMeaningfulMessage(content, userId) {
  const lower = content.toLowerCase();
  const words = content.split(/\s+/).filter(w => w.length > 0);

  // Duplicate Check
  if (lastMessages.get(userId) === lower) {
    return { valid: false, reason: "Duplicate message" };
  }

  // Generic Word Filter
  const cleanWords = words.filter(w => !GENERIC_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, "")));
  if (cleanWords.length < MIN_WORDS && !lower.includes("?")) {
    return { valid: false, reason: "Insufficient depth/Generic" };
  }

  return { valid: true };
}
