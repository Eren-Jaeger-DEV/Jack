const { SlashCommandBuilder } = require("discord.js");
const { refreshMarketPanel, MARKET_CHANNEL_ID } = require("../../../bot/utils/marketPanel");

const ALLOWED_ROLE_ID = "1480600580408742029";

module.exports = {

  name: "popmarket",
  category: "market",
  description: "Force refresh the POP marketplace panel",
  aliases: ["market","marketplace"],
  usage: "/popmarket  |  j pop market",
  details: "Force-refreshes the POP marketplace panel in the designated channel.",

  data: new SlashCommandBuilder()
    .setName("popmarket")
    .setDescription("Force refresh the POP marketplace panel"),

  async run(ctx) {

    if (!ctx.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return ctx.reply({ content: "❌ You don't have access to the POP market.", flags: 64 });
    }

    // Also explicitly restrict prefix usage to "pop market" specifically if we map it like that
    // but in discord.js collection it will hit the `popmarket` file unless structured strictly.
    // For hybrid prefix "jack pop market", the base command would need to be `pop` and route to `market` subcmd.
    // Assuming user maps "popmarket" command natively or we handle alias parsing.

    await ctx.defer?.() || await ctx.reply("Refreshing market...");

    await refreshMarketPanel(ctx.client);

    const replyFn = ctx.editReply ? ctx.editReply.bind(ctx) : ctx.reply.bind(ctx);
    await replyFn(`✅ Market panel refreshed in <#${MARKET_CHANNEL_ID}>.`);

  }
};
