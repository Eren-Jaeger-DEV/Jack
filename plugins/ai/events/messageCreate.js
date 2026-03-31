/**
 * Jack AI - Event Handler: messageCreate
 * Handles automated responses in the AI channel and bot pings.
 */

const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { getClanContext } = require('../../../bot/utils/clanContext');

// In-memory history cache: ChannelID -> Array of { role, parts: [{ text }] }
const chatHistory = new Map();

/**
 * Store message in history and keep it under the limit.
 */
function updateHistory(channelId, role, content) {
    if (!chatHistory.has(channelId)) chatHistory.set(channelId, []);
    const history = chatHistory.get(channelId);
    
    // Format: { role: 'user'|'assistant', content: '...' }
    history.push({ role, content });
    
    // Keep last 10 interactions (20 messages total)
    if (history.length > 20) history.shift(); 
}

module.exports = {
    name: "messageCreate",

    async execute(message, client) {
        // Basic ignores
        if (message.author.bot || !message.guild) return;

        const config = await configManager.getGuildConfig(message.guild.id);
        const aiChannelId = config?.settings?.aiChannelId;
        const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;

        // Decision: Should I respond?
        const isAiChannel = aiChannelId && message.channel.id === aiChannelId;
        
        // If mentioned outside the AI channel, redirect them ONLY if an AI channel exists
        if (isMentioned && !isAiChannel && aiChannelId) {
            return message.reply(`❌ **Jack AI** is only available in <#${aiChannelId}>. Please chat there!`).catch(() => {});
        }

        // If no AI channel is set, allow responses to mentions anywhere
        if (!isAiChannel && !isMentioned) return;

        console.log(`[AI Plugin] Message received from ${message.author.tag}: ${message.content}`);

        // Extract prompt: remove the bot's mention if present
        let prompt = message.content
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        // If user just pinged without text, give a default greeting
        if (!prompt && isMentioned) prompt = "Hello Jack!";
        if (!prompt) return;

        console.log(`[AI Plugin] Processing prompt: ${prompt}`);

        // Trigger typing to show Jack is "thinking"
        try { await message.channel.sendTyping(); } catch {}

        // Send placeholder message for streaming
        let streamingMessage = await message.reply("⏳ **Jack is thinking...**").catch(() => null);
        if (!streamingMessage) return;

        console.log(`[AI Plugin] Sent 'Thinking' message, calling AIService...`);

        // Fetch Live Clan Context (Brain Rewrite)
        const extraContext = await getClanContext(message.guild);

        // Retrieve existing history for this channel
        const history = chatHistory.get(message.channel.id) || [];
        
        let lastUpdateTime = Date.now();
        let lastContent = "";

        try {
            // AI call with streaming callback and EXTRA CONTEXT
            const response = await aiService.generateResponse(prompt, history, async (token, fullText) => {
                const now = Date.now();
                // Update message every 1.5 seconds to respect Discord rate limits
                if (now - lastUpdateTime > 1500 && fullText.length > 0) {
                    lastUpdateTime = now;
                    lastContent = fullText;
                    // Add a typing cursor (▌) for visual effect
                    await streamingMessage.edit(fullText.substring(0, 1990) + " ▌").catch(() => {});
                }
            }, extraContext);

            // Final update to clean up cursor and set exact response
            if (response.length > 1900) {
                // If extremely long, we might need to split, but for now just cap the edit
                await streamingMessage.edit(response.substring(0, 1990)).catch(() => {});
            } else {
                await streamingMessage.edit(response).catch(() => {});
            }

            // Update local history for continuity
            updateHistory(message.channel.id, 'user', prompt);
            updateHistory(message.channel.id, 'assistant', response);

        } catch (err) {
            console.error('[JackAI] Chat interaction error:', err.message);
        }
    }
};
