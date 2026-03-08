const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "ping",
  description: "Check bot latency",

  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  /* ---------- SLASH COMMAND ---------- */

  async execute(interaction) {

    await interaction.reply("Zinda hu");

  },

  /* ---------- PREFIX COMMAND ---------- */

  async runPrefix(client, message) {

    message.reply("Zinda hu");

  }

};