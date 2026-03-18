const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "ping",
  category: "utility",
  description: "Check bot latency",
  aliases: ["latency","pong"],
  usage: '/ping  |  j ping',
  details: 'Shows the bot's current latency to the Discord API.',

  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async run(ctx) {

    await ctx.reply("Zinda hu");

  }

};