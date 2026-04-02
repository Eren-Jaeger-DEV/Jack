const aiService = require("../bot/utils/aiService");
const configManager = require("../bot/utils/configManager");
const { OWNER_IDS } = require("../bot/utils/persona");
const { getClanContext } = require("../bot/utils/clanContext");
const ConversationHistory = require("../bot/database/models/ConversationHistory");
const UserActivity = require("../bot/database/models/UserActivity");
const aiValidator = require("./aiValidator");
const toolService = require("../bot/utils/toolService");
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
    const isAdmin = message.member.permissions.has("Administrator");

    // Cooldown Check
    if (!isAdmin && userCooldowns.has(userId)) {
      const remaining = COOLDOWN_MS - (Date.now() - userCooldowns.get(userId));
      if (remaining > 0) {
        addLog("AIController", `Filtered: Cooldown active for ${message.author.tag} (${remaining}ms)`);
        return false;
      }
    }

    // Meaningful Input Check (Admin Bypass)
    if (!isAdmin) {
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
      const isOwner = OWNER_IDS.includes(userId);

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
        const validation = await aiValidator.validateAction(decision, member, guild, isOwner);
        
        if (validation.valid) {
          if (isOwner) addLog("AIController", `[MASTER_OVERRIDE] Executing ${decision.tool} for Owner`);
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
             
             const successText = `✅ **Action Confirmed**: ${result.message}`;
             if (isInteraction) await context.editReply(successText).catch(() => {});
             else if (streamingMessage.isOwnerStub) await context.reply(successText).catch(() => {});
             else await streamingMessage.edit(successText).catch(() => {});
             
             await this._updateHistory(channelId, content, `[ACTION_SUCCESS: ${decision.tool}] ${result.message}`);
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
        const responseText = this._extractFinalText(decision.text);
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
    if (!rawText) return DEFAULT_FALLBACK;
    
    let clean = rawText.trim();

    try {
      // 1. Try direct JSON parse
      const parsed = JSON.parse(clean);
      if (parsed.text) return parsed.text;
      if (parsed.message) return parsed.message;
      if (parsed.response) return parsed.response;
      if (parsed.tool) return `[System: Processing ${parsed.tool}]`;
    } catch (e) {
      // 2. Handle partial or malformed JSON via regex
      const textMatch = clean.match(/"text"\s*:\s*"([^"]+)"/i);
      if (textMatch) return textMatch[1];

      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const innerParsed = JSON.parse(jsonMatch[0]);
          if (innerParsed.text) return innerParsed.text;
        } catch (innerE) {}
      }
    }
    
    // 3. Final Sanity: Aggressive strip for common JSON markers
    const finalClean = clean
      .replace(/^\{[\s\S]*"text"\s*:\s*"/i, "") // Strip starting JSON if it matches text field
      .replace(/"\s*\}?$/, "")                   // Strip trailing JSON artifacts
      .replace(/\{[\s\S]*\}|\[[\s\S]*\]/g, "")   // Strip any balanced blocks
      .trim();

    return finalClean || DEFAULT_FALLBACK;
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
