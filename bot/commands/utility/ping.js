const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "ping",
  category: "utility",
  description: "Check bot latency",

  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async run(ctx) {

    await ctx.reply("Zinda hu");

  }

};