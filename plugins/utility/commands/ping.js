const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "ping",
  category: "utility",
  description: "Check bot latency",
  aliases: ["latency","pong"],
  usage: "/ping  |  j ping",
  details: "Shows the bot's current latency to the Discord API.",

  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async run(ctx) {
    const ping = ctx.client.ws.ping;
    const msgLatency = Date.now() - (ctx.interaction?.createdTimestamp || ctx.message?.createdTimestamp || Date.now());

    const response = `**Zinda hu** \n\n🛰️ **API Latency:** \`${ping}ms\`\n⚡ **Heartbeat:** \`${msgLatency}ms\``;

    await ctx.reply(response);
  }

};