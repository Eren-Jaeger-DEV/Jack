const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const { handleError } = require('../../../core/errorHandler');

/**
 * AI Ask Command — Core Interaction
 * Blueprint standard with enhanced error handling and context compatibility.
 */

module.exports = {
  name: "ask",
  category: "ai",
  description: "Ask Jack AI a question",
  aliases: ["ai", "jack"],
  usage: "/ask <prompt>",
  details: "Interacts with the Gemini AI model to provide intelligent responses based on clan context.",

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

    // 2. Standardized defer (handles both slash and prefix typing states)
    await ctx.defer();

    try {
      const response = await aiService.generateResponse(prompt);

      // 3. Handle response length (Discord limit is 2000 for content, ~4000 for embeds)
      if (response.length > 1900) {
        const embed = new EmbedBuilder()
          .setTitle("🤖 Jack AI Response")
          .setColor("Gold")
          .setDescription(response.slice(0, 4000))
          .setFooter({ text: "Context-aware response generated via Gemini 1.5 Flash" })
          .setTimestamp();
          
        return ctx.reply({ embeds: [embed] });
      }

      await ctx.reply({ content: response });

    } catch (err) {
      // 4. Standardized Global Error Handling
      await handleError(err, ctx, "ask");
    }
  }
};
