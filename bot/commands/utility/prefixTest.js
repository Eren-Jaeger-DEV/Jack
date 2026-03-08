const {
  SlashCommandBuilder
} = require('discord.js');

module.exports = {

  name: "prefixtest",
  category: "utility",

  data: new SlashCommandBuilder()
    .setName('prefixtest')
    .setDescription('Test prefix system'),

  async run(ctx) {

    ctx.reply("✅ Prefix system working.");

  }

};