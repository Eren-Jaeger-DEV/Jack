const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { getClanContext } = require('../../../bot/utils/clanContext');
const ConversationHistory = require('../../../bot/database/models/ConversationHistory');

const channelLocks = new Map(); // PROTECTOR: One stream at a time per channel

/**
 * Persists chat history to MongoDB.
 */
async function updateHistory(channelId, role, content) {
    try {
        let history = await ConversationHistory.findOne({ channelId });
        if (!history) history = new ConversationHistory({ channelId, messages: [] });
        
        history.messages.push({ role, content });
        if (history.messages.length > 20) history.messages.shift();
        
        history.lastActive = Date.now();
        await history.save();
    } catch (e) {
        console.error("[JackAI History] Failed to save:", e.message);
    }
}

module.exports = {
    name: "messageCreate",

    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // 1. Fetch Config & Check Channel
        const config = await configManager.getGuildConfig(message.guild.id);
        const aiChannelId = config?.settings?.aiChannelId;
        const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;
        const isAiChannel = aiChannelId && message.channel.id === aiChannelId;
        
        // 2. Logic Check: Ignore if not mentioned and not in AI channel
        if (!isAiChannel && !isMentioned) return;

        // 3. Channel Stream Lock: Avoid overlapping responses
        if (channelLocks.has(message.channel.id)) return;
        channelLocks.set(message.channel.id, true);

        let prompt = message.content
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        if (!prompt && isMentioned) prompt = "Hello Jack!";
        if (!prompt) {
            channelLocks.delete(message.channel.id);
            return;
        }

        try { await message.channel.sendTyping(); } catch {}

        let streamingMessage = await message.reply("⚡ **Jack is formulating a strategy...**").catch(() => null);
        if (!streamingMessage) {
            channelLocks.delete(message.channel.id);
            return;
        }

        // 4. Fetch Live Clan Stats & Member Diary (Ground Truth)
        const { context: extraContext, reputationScore } = await getClanContext(message.guild, message.member);
        
        // 5. Fetch History from DB
        let history = [];
        try {
            const historyDoc = await ConversationHistory.findOne({ channelId: message.channel.id });
            if (historyDoc) {
                history = historyDoc.messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }));
            }
        } catch (e) { console.error("[JackAI History] Fetch error:", e.message); }
        
        let lastUpdateTime = Date.now();
        let inThinkingPhase = true;
        let pulseFrame = 0;
        const pulses = ["⚡", "🤔", "🧠", "🔍"];

        try {
            const response = await aiService.generateResponse(prompt, history, async (token, fullText, status) => {
                const now = Date.now();
                
                // Handle "Thinking" pulse updates
                if (status.type === 'thinking') {
                    if (now - lastUpdateTime > 1000) {
                        lastUpdateTime = now;
                        pulseFrame = (pulseFrame + 1) % pulses.length;
                        let statusMsg = status.status || "thinking...";
                        if (statusMsg.includes("matchmaking")) statusMsg = "📊 Drafting Squads...";
                        if (statusMsg.includes("foster")) statusMsg = "🤝 Calculating Pairings...";
                        if (statusMsg.includes("announcement")) statusMsg = "📝 Drafting Announcement...";
                        
                        await streamingMessage.edit(`${pulses[pulseFrame]} **Jack is ${statusMsg}**`).catch(() => {});
                    }
                    return;
                }

                if (status.type === 'text' && inThinkingPhase) {
                    inThinkingPhase = false;
                    lastUpdateTime = 0;
                }

                // Streaming updates (FAST: 800ms safety buffer)
                if (!inThinkingPhase && now - lastUpdateTime > 800 && fullText.length > 0) {
                    lastUpdateTime = now;
                    await streamingMessage.edit(fullText.substring(0, 1990) + " ▌").catch(() => null);
                }
            }, extraContext, message.guild, message.member, null, reputationScore);

            const finalResponse = response || "❌ Jack is speechless.";
            if (finalResponse.length > 1900) {
                await streamingMessage.edit(finalResponse.substring(0, 1990)).catch(() => {});
            } else {
                await streamingMessage.edit(finalResponse).catch(() => {});
            }

            // Persistence
            await updateHistory(message.channel.id, 'user', prompt);
            await updateHistory(message.channel.id, 'model', finalResponse);

        } catch (error) {
            console.error("[JackAI Neural] Failure:", error.message);
            if (streamingMessage) await streamingMessage.edit("❌ **Jack's brain encountered a problem. Please try again.**").catch(() => {});
        } finally {
            channelLocks.delete(message.channel.id); // RELEASE THE LOCK
        }
    }
};
