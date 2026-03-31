const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { handleError } = require('../../../core/errorHandler');

/**
 * AI Ask Command — Core Interaction
 * Enhanced with ChatGPT-style streaming updates.
 */

module.exports = {
  name: "ask",
  category: "ai",
  description: "Ask Jack AI a question",
  aliases: ["ai", "jack"],
  usage: "/ask <prompt>",
  details: "Interacts with local Ollama to provide streaming intelligent responses.",

  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask Jack AI a question")
    .addStringOption(o => o.setName("prompt").setDescription("What do you want to ask?").setRequired(true)),

  async run(ctx) {
    const config = await configManager.getGuildConfig(ctx.guild.id);
    const aiChannelId = config?.settings?.aiChannelId;

    // 1. Enforce channel restriction
    if (aiChannelId && ctx.channel.id !== aiChannelId) {
      return ctx.reply({ 
        content: `❌ **Jack AI** is only available in <#${aiChannelId}>. Please use the command there!`, 
        ephemeral: true 
      });
    }

    const prompt = ctx.options.getString("prompt");

    // 2. Initial Defer/Response
    await ctx.defer();
    const startTime = Date.now();
    let currentText = "⏳ **Jack is thinking...**";
    await ctx.editReply({ content: currentText });

    let lastUpdate = Date.now();
    let firstTokenReceived = false;
    const UPDATE_INTERVAL = 500; // Update Discord every 500ms for high responsiveness

    try {
      const fullResponse = await aiService.generateResponse(prompt, [], async (token, fullText) => {
        const now = Date.now();
        
        // IMMEDIATE FIRST TOKEN: Bypass the 500ms timer for the first word
        // This ensures the user sees Jack start "writing" instantly.
        if (!firstTokenReceived || (now - lastUpdate > UPDATE_INTERVAL)) {
          firstTokenReceived = true;
          lastUpdate = now;
          let display = fullText + " ▌"; // Cursor effect
          
          if (display.length > 2000) display = display.slice(-1990); // Keep Discord limits in check
          
          await ctx.editReply({ content: display }).catch(() => null);
        }
      });

      // 3. Final completion
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const footer = `\n\n*Generated in ${duration}s via Ollama (tinyllama)*`;
      
      let finalContent = fullResponse + footer;
      
      if (finalContent.length > 2000) {
        const embed = new EmbedBuilder()
          .setTitle("🤖 Jack AI Response")
          .setColor("Gold")
          .setDescription(fullResponse.slice(0, 4000))
          .setFooter({ text: `Ollama (tinyllama) • ${duration}s` })
          .setTimestamp();
          
        return ctx.editReply({ content: "✅ Response complete:", embeds: [embed] });
      }

      await ctx.editReply({ content: finalContent });

    } catch (err) {
      await handleError(err, ctx, "ask");
    }
  }
};
