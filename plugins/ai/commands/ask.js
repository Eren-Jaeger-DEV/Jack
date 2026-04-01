const { SlashCommandBuilder } = require('discord.js');
const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { getClanContext } = require('../../../bot/utils/clanContext');
const ConversationHistory = require('../../../bot/database/models/ConversationHistory');

module.exports = {
  name: "ask",
  category: "ai",
  description: "Ask Jack AI a question",
  aliases: ["ai", "jack"],
  usage: "/ask <prompt>",

  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask Jack AI a question")
    .addStringOption(o => o.setName("prompt").setDescription("What do you want to ask?").setRequired(true))
    .addAttachmentOption(o => o.setName("image").setDescription("Optional image to show Jack").setRequired(false)),

  async run(ctx) {
    const config = await configManager.getGuildConfig(ctx.guild.id);
    const aiChannelId = config?.settings?.aiChannelId;

    if (aiChannelId && ctx.channel.id !== aiChannelId) {
      return ctx.reply({ 
        content: `❌ **Jack AI** is only available in <#${aiChannelId}>. Please use the command there!`, 
        ephemeral: true 
      });
    }

    const prompt = ctx.options.getString("prompt") || ctx.message?.content;
    const attachment = ctx.options.getAttachment("image") || ctx.message?.attachments?.first();
    const imageUrl = attachment ? attachment.url : null;

    // 1. Initial Defer/Response
    await ctx.defer();
    const startTime = Date.now();
    await ctx.editReply({ content: imageUrl ? "📸 **Jack is analyzing the image...**" : "⚡ **Jack is formulating a strategy...**" });

    // 2. Fetch Live Clan Stats & Member Diary (Ground Truth)
    const { context: extraContext, reputationScore } = await getClanContext(ctx.guild, ctx.member);

    // 3. Fetch History from DB
    let history = [];
    try {
        const historyDoc = await ConversationHistory.findOne({ channelId: ctx.channel.id });
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
        
        // Handle "Thinking" pulse updates (and tool status)
        if (status.type === 'thinking') {
          if (now - lastUpdateTime > 1000) {
            lastUpdateTime = now;
            pulseFrame = (pulseFrame + 1) % pulses.length;
            let statusMsg = status.status || "formulating strategy...";
            if (statusMsg.includes("matchmaking")) statusMsg = "📊 Drafting Squads...";
            if (statusMsg.includes("foster")) statusMsg = "🤝 Calculating Pairings...";
            if (statusMsg.includes("announcement")) statusMsg = "📝 Drafting Announcement...";
            
            await ctx.editReply({ content: `${pulses[pulseFrame]} **Jack is ${statusMsg}**` }).catch(() => null);
          }
          return;
        }

        // Transition: Thinking -> Text
        if (status.type === 'text' && inThinkingPhase) {
            inThinkingPhase = false;
            lastUpdateTime = 0;
        }

        // Streaming updates (1.2s safety buffer)
        if (!inThinkingPhase && now - lastUpdateTime > 1200 && fullText.length > 0) {
          lastUpdateTime = now;
          let display = fullText + " ▌";
          if (display.length > 2000) display = display.slice(-1990);
          await ctx.editReply({ content: display }).catch(() => null);
        }
      }, extraContext, ctx.guild, ctx.member, imageUrl, reputationScore);

      // 4. Persistence
      try {
          let historyDoc = await ConversationHistory.findOne({ channelId: ctx.channel.id });
          if (!historyDoc) historyDoc = new ConversationHistory({ channelId: ctx.channel.id, messages: [] });
          historyDoc.messages.push({ role: 'user', content: prompt });
          historyDoc.messages.push({ role: 'model', content: response || "" });
          if (historyDoc.messages.length > 20) historyDoc.messages.shift();
          historyDoc.lastActive = Date.now();
          await historyDoc.save();
      } catch (e) { console.error("[JackAI History] Save error:", e.message); }

      // 5. Final completion
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const footer = `\n\n*Generated in ${duration}s via Gemini 3.1 Pro*`;
      
      const finalResponse = response || "❌ Jack is speechless.";
      if (finalResponse.length > 1900) {
        await ctx.editReply({ content: finalResponse.substring(0, 1900) + footer });
      } else {
        await ctx.editReply({ content: finalResponse + footer });
      }

    } catch (err) {
      console.error('[JackAI] Ask interaction error:', err.message);
      await ctx.editReply({ content: "❌ **Jack's brain encountered a problem.** Please try again." }).catch(() => null);
    }
  }
};
