const aiService = require('../../bot/utils/aiService');
const configManager = require('../../bot/utils/configManager');

/**
 * index.js — AI Plugin Entry Point
 * 
 * Responsibilities:
 *  1. Smart Channel Handler — Respond automatically in AI_CHANNEL
 *  2. Mention Handler — Respond when the bot is pinged
 *  3. Chat History — Simple in-memory memory per channel
 */

// In-memory history cache: ChannelID -> Array of { role, parts: [{ text }] }
const chatHistory = new Map();

/**
 * Store message in history and keep it under the limit.
 */
function updateHistory(channelId, role, content) {
  if (!chatHistory.has(channelId)) chatHistory.set(channelId, []);
  const history = chatHistory.get(channelId);
  
  // Format: { role: 'user'|'model', parts: [{ text: '...' }] }
  history.push({ role, parts: [{ text: content }] });
  
  // Keep last 10 interactions (20 messages total)
  if (history.length > 20) history.shift(); 
}

module.exports = {
  name: 'ai',

  load(client) {
    this._onMessage = async (message) => {
      // Basic ignores
      if (message.author.bot || !message.guild) return;

      const config = await configManager.getGuildConfig(message.guild.id);
      const aiChannelId = config?.settings?.aiChannelId;
      const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;

      // Decision: Should I respond?
      const isAiChannel = aiChannelId && message.channel.id === aiChannelId;
      if (!isAiChannel && !isMentioned) return;

      // Extract prompt: remove the bot's mention if present
      let prompt = message.content
        .replace(`<@!${client.user.id}>`, '')
        .replace(`<@${client.user.id}>`, '')
        .trim();

      // If user just pinged without text, give a default greeting
      if (!prompt && isMentioned) prompt = "Hello Jack!";
      if (!prompt) return;

      // Trigger typing to show Jack is "thinking"
      try { await message.channel.sendTyping(); } catch {}

      // Retrieve existing history for this channel
      const history = chatHistory.get(message.channel.id) || [];
      
      try {
        // AI call
        const response = await aiService.generateResponse(prompt, history);

        // Update local history for continuity
        updateHistory(message.channel.id, 'user', prompt);
        updateHistory(message.channel.id, 'model', response);

        // Send the response (handle Discord message length limits)
        if (response.length > 1900) {
          // Split into chunks if necessary
          const chunks = response.match(/[\s\S]{1,1900}/g) || [];
          for (const chunk of chunks) {
            await message.reply(chunk).catch(() => {});
          }
        } else {
          await message.reply(response).catch(() => {});
        }

      } catch (err) {
        console.error('[JackAI] Chat interaction error:', err.message);
      }
    };

    client.on('messageCreate', this._onMessage);
  },

  unload(client) {
    if (this._onMessage) {
      client.removeListener('messageCreate', this._onMessage);
      this._onMessage = null;
    }
    chatHistory.clear();
  }
};
