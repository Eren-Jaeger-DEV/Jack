const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { getClanContext } = require('../../../bot/utils/clanContext');

// In-memory history cache
const chatHistory = new Map();
const channelLocks = new Map(); // PROTECTOR: One stream at a time per channel

function updateHistory(channelId, role, content) {
    if (!chatHistory.has(channelId)) chatHistory.set(channelId, []);
    const history = chatHistory.get(channelId);
    history.push({ role, content });
    if (history.length > 20) history.shift(); 
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
        const extraContext = await getClanContext(message.guild, message.member);
        
        const history = chatHistory.get(message.channel.id) || [];
        
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
            }, extraContext, message.guild, message.member);

            if (response.length > 1900) {
                await streamingMessage.edit(response.substring(0, 1990)).catch(() => {});
            } else {
                await streamingMessage.edit(response).catch(() => {});
            }

            updateHistory(message.channel.id, 'user', prompt);
            updateHistory(message.channel.id, 'assistant', response);

        } catch (error) {
            console.error("[Gemini 3.1 Neural] Failure:", error.message);
            if (streamingMessage) await streamingMessage.edit("❌ **Jack's brain encountered a problem. Please try again.**").catch(() => {});
        } finally {
            channelLocks.delete(message.channel.id); // RELEASE THE LOCK
        }
    }
};
