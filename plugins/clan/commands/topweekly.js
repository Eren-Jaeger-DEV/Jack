const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "topweekly",
  category: "clan",
  description: "Show weekly synergy leaderboard",
  aliases: ["weeklylb","weeklyboard"],
  usage: '/topweekly  |  j topweekly',
  details: 'Displays the weekly synergy leaderboard for all registered players.',

  data: new SlashCommandBuilder()
    .setName("topweekly")
    .setDescription("Show weekly synergy leaderboard"),

  async run(ctx) {

    const players = await Player.find()
      .sort({ weeklySynergy: -1 })
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

      leaderboard += `**${i + 1}.** ${name} — ${p.weeklySynergy}\n`;

    }

    const embed = new EmbedBuilder()
      .setTitle("🔥 Weekly Synergy Leaderboard")
      .setDescription(leaderboard)
      .setColor("Orange");

    ctx.reply({ embeds: [embed] });

  }

};