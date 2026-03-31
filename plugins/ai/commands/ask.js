const { SlashCommandBuilder } = require('discord.js');
const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { getClanContext } = require('../../../bot/utils/clanContext');

module.exports = {
  name: "ask",
  category: "ai",
  description: "Ask Jack AI a question",
  aliases: ["ai", "jack"],
  usage: "/ask <prompt>",

  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask Jack AI a question")
    .addStringOption(o => o.setName("prompt").setDescription("What do you want to ask?").setRequired(true)),

  async run(ctx) {
    const config = await configManager.getGuildConfig(ctx.guild.id);
    const aiChannelId = config?.settings?.aiChannelId;

    if (aiChannelId && ctx.channel.id !== aiChannelId) {
      return ctx.reply({ 
        content: `❌ **Jack AI** is only available in <#${aiChannelId}>. Please use the command there!`, 
        ephemeral: true 
      });
    }

    const prompt = ctx.options.getString("prompt");

    // 1. Initial Defer/Response
    await ctx.defer();
    const startTime = Date.now();
    await ctx.editReply({ content: "⚡ **Jack is formulating a strategy...**" });

    // 2. Fetch Live Clan Stats & Member Diary (Ground Truth)
    const extraContext = await getClanContext(ctx.guild, ctx.member);

    let lastUpdateTime = Date.now();
    let inThinkingPhase = true;
    let pulseFrame = 0;
    const pulses = ["⚡", "🤔", "🧠", "🔍"];

    try {
      // High-Response call with 1200ms refresh and Full Power Context
      const response = await aiService.generateResponse(prompt, [], async (token, fullText, status) => {
        const now = Date.now();
        
        // Handle "Thinking" pulse updates (and tool status)
        if (status.type === 'thinking') {
          if (now - lastUpdateTime > 1000) {
            lastUpdateTime = now;
            pulseFrame = (pulseFrame + 1) % pulses.length;
            let statusMsg = status.status || "formulating strategy...";
            // Add custom icons for strategic tasks
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
      }, extraContext, ctx.guild, ctx.member);

      // 3. Final completion
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const footer = `\n\n*Generated in ${duration}s via Gemini 3.1 Pro*`;
      
      if (response.length > 1900) {
        await ctx.editReply({ content: response.substring(0, 1900) + footer });
      } else {
        await ctx.editReply({ content: response + footer });
      }

    } catch (err) {
      console.error('[JackAI] Ask interaction error:', err.message);
      await ctx.editReply({ content: "❌ **Jack's brain encountered a problem.** Please try again." }).catch(() => null);
    }
  }
};
