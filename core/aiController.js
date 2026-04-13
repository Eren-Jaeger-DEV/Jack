const perms = require("../bot/utils/permissionUtils");
const { OWNER_IDS } = require("../bot/utils/persona");
const { getClanContext } = require("../bot/utils/clanContext");
const ConversationHistory = require("../bot/database/models/ConversationHistory");
const UserActivity = require("../bot/database/models/UserActivity");
const aiValidator = require("./aiValidator");
const toolService = require("../bot/utils/toolService");
const aiService = require("../bot/utils/aiService");
const observer = require("./observer");
const { addLog } = require("../utils/logger");

const channelLocks = new Map();
const userCooldowns = new Map();
const lastMessages = new Map();

const GENERIC_WORDS = ["hi", "ok", "hello", "jack", "hey", "yo", "yes", "no"];
const MIN_WORDS = 2; // Reduced slightly for better balance
const COOLDOWN_MS = 3000;

/**
 * AI CONTROLLER (v2.1.0) - Adaptive Decision Edition
 * Implements intent classification, validation, and feedback loop.
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
      let history = await this._getHistory(channelId);

      // 2. AI Execution
      addLog("AIController", `Adaptive Engine: Analyzing ${context.user?.tag || context.author?.tag} (Owner: ${isOwner})`);
      
      let streamingMessage;
      if (isInteraction) {
        if (!context.deferred && !context.replied) await context.deferReply().catch(() => {});
        // Speed Optimization: Skip "analyzing" for owner
        if (!isOwner) streamingMessage = await context.editReply("⚡ **Jack is analyzing intent...**").catch(() => null);
        else streamingMessage = { edit: async () => {}, isOwnerStub: true }; 
      } else {
        if (!isOwner) streamingMessage = await context.reply("⚡ **Jack is analyzing intent...**").catch(() => null);
        else streamingMessage = { edit: async () => {}, isOwnerStub: true };
      }

      if (!streamingMessage && !isOwner) throw new Error("Failed to send initial reply.");

      // Fetch User Activity for persona adaptation
      const activityData = await UserActivity.findOne({ discordId: userId }) || {};

      const decision = await aiService.generateResponse(
        content,
        history,
        null, 
        extraContext,
        guild,
        member,
        null,
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

          const result = await toolService[decision.tool](decision.args, member, guild);
          
          if (result.success) {
             await observer.recordActionSuccess(member.id, decision.tool);
             
             // UPDATE HISTORY with the call so the Interpretation Pass has context
             await this._updateHistory(channelId, content, `[AI_CALL: ${decision.tool}]`);

             // PHASE: Interpretation Pass (Self-Awareness)
             const feedbackPrompt = `[TOOL_RESULT: ${decision.tool}] ${JSON.stringify(result.data || result.message)}`;
             
             const interpretation = await aiService.generateResponse(
                feedbackPrompt,
                history,
                null,
                extraContext,
                guild,
                member,
                null,
                reputationScore,
                activityData,
                isOwner
             );

             addLog("AIController", `Interpretation Pass Raw: ${interpretation.text.substring(0, 50)}...`);
             const responseText = this._extractFinalText(interpretation.text);
             addLog("AIController", `Interpretation Pass Processed: ${responseText.substring(0, 50)}...`);
             
             if (isInteraction) await context.editReply(responseText).catch(() => {});
             else if (streamingMessage.isOwnerStub) await context.reply(responseText).catch(() => {});
             else await streamingMessage.edit(responseText).catch(() => {});
             
             await this._updateHistory(channelId, content, responseText);
          } else {
             await observer.recordActionFailure(member.id, decision.tool);
             const errorText = `❌ **Action Failed**: ${result.message}`;
             if (isInteraction) await context.editReply(errorText).catch(() => {});
             else if (streamingMessage.isOwnerStub) await context.reply(errorText).catch(() => {});
             else await streamingMessage.edit(errorText).catch(() => {});
             
             await this._updateHistory(channelId, content, `[ACTION_FAILURE: ${decision.tool}] ${result.message}`);
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
        await this._updateHistory(channelId, content, responseText);
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

  /**
   * Safe JSON Parser for AI Output
   */
  _parseDecision(rawText) {
    try {
      // Find JSON block if AI included any text around it
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
      return JSON.parse(jsonStr);
    } catch (e) {
      addLog("AIController", `Parse Failed. Raw: ${rawText.substring(0, 50)}...`);
      return { 
        intent: "chat", 
        type: "response", 
        text: rawText.replace(/[\{\}]/g, '').substring(0, 2000) 
      };
    }
  },

  async _getHistory(channelId) {
    try {
      const historyDoc = await ConversationHistory.findOne({ channelId });
      if (!historyDoc) return [];
      return historyDoc.messages.map(m => ({ 
        role: m.role === 'model' ? 'assistant' : 'user', 
        content: m.content 
      }));
    } catch (e) { return []; }
  },

  async _updateHistory(channelId, userPrompt, aiResponse) {
    try {
      let history = await ConversationHistory.findOne({ channelId });
      if (!history) history = new ConversationHistory({ channelId, messages: [] });
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
