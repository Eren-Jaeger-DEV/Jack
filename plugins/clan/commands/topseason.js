const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "topseason",
  category: "clan",
  description: "Show season synergy leaderboard",

  data: new SlashCommandBuilder()
    .setName("topseason")
    .setDescription("Show season synergy leaderboard"),

  async run(ctx) {

    const players = await Player.find()
      .sort({ seasonSynergy: -1 })
      .limit(10);

    if (!players.length)
      return ctx.reply("No players registered.");

    let leaderboard = "";

    for (let i = 0; i < players.length; i++) {

      const p = players[i];

      let name = p.discordName;

      try {

        const member = await ctx.guild.members.fetch(p.discordId);
        name = member.user.username;

      } catch {}

      leaderboard += `**${i + 1}.** ${name} — ${p.seasonSynergy}\n`;

    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Season Synergy Leaderboard")
      .setDescription(leaderboard)
      .setColor("Gold");

    ctx.reply({ embeds: [embed] });

  }

};