const { SlashCommandBuilder } = require("discord.js");
const Level = require("../../database/models/Level");

module.exports = {

  name: "rank",
  category: "level",

  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your rank"),

  async execute(interaction) {

    const profile = await Level.findOne({
      userId: interaction.user.id,
      guildId: interaction.guild.id
    });

    if (!profile) {

      return interaction.reply("No XP yet.");

    }

    const rank =
      (await Level.countDocuments({
        guildId: interaction.guild.id,
        xp: { $gt: profile.xp }
      })) + 1;

    interaction.reply(
      `Level: **${profile.level}**\nXP: **${profile.xp}**\nRank: **${rank}**`
    );

  },

  async runPrefix(client, message) {

    const profile = await Level.findOne({
      userId: message.author.id,
      guildId: message.guild.id
    });

    if (!profile) return message.reply("No XP yet.");

    const rank =
      (await Level.countDocuments({
        guildId: message.guild.id,
        xp: { $gt: profile.xp }
      })) + 1;

    message.reply(
      `Level: **${profile.level}**\nXP: **${profile.xp}**\nRank: **${rank}**`
    );

  }

};