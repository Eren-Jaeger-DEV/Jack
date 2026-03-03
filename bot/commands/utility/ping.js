const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Ping command"),

  async execute(interaction) {
    await interaction.reply("Zinda hu!");
  },

  async prefixExecute(message) {
    await message.reply("Zinda hu!");
  }
};