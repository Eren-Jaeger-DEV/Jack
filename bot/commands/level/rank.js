const { SlashCommandBuilder } = require("discord.js");
const Level = require("../../database/models/Level");

module.exports = {

  name: "rank",
  category: "level",
  description: "Show your level, XP, and server rank",

  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your rank"),

  async run(ctx) {

    const profile = await Level.findOne({
      userId: ctx.user.id,
      guildId: ctx.guild.id
    });

    if (!profile) {
      return ctx.reply("No XP yet.");
    }

    const rank =
      (await Level.countDocuments({
        guildId: ctx.guild.id,
        xp: { $gt: profile.xp }
      })) + 1;

    ctx.reply(
      `Level: **${profile.level}**\nXP: **${profile.xp}**\nRank: **${rank}**`
    );

  }

};