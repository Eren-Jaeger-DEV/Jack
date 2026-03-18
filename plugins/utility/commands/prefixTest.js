const {
  SlashCommandBuilder
} = require('discord.js');

module.exports = {

  name: "prefixtest",
  category: "utility",
  description: "Test prefix system",
  aliases: ["testprefix","prefix"],
  usage: '/prefixtest  |  j prefixtest',
  details: 'Tests that the prefix system is working correctly.',

  data: new SlashCommandBuilder()
    .setName('prefixtest')
    .setDescription('Test prefix system'),

  async run(ctx) {

    ctx.reply("✅ Prefix system working.");

  }

};