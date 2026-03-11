const Player = require("../../database/models/Player");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "mysynergy",
  category: "clan",
  description: "See how many synergy points you need to pass the next player",

  data: new SlashCommandBuilder()
    .setName("mysynergy")
    .setDescription("See how many synergy points you need to pass the next player"),

  async run(ctx) {

    const user = ctx.user;

    const player = await Player.findOne({ discordId: user.id });

    if (!player)
      return ctx.reply("❌ You are not registered.");

    /* ---------- SEASON LEADERBOARD ---------- */

    const seasonList = await Player.find().sort({ seasonSynergy: -1 });

    const seasonRank = seasonList.findIndex(p => p.discordId === user.id);

    let seasonMsg = "🏆 You are currently **#1** in the season leaderboard.";

    if (seasonRank > 0) {

      const above = seasonList[seasonRank - 1];
      const diff = above.seasonSynergy - player.seasonSynergy + 1;

      let name = above.discordName;

      try {
        const member = await ctx.guild.members.fetch(above.discordId);
        name = member.user.username;
      } catch {}

      seasonMsg = `Need **${diff}** synergy to pass **${name}**`;
    }

    /* ---------- WEEKLY LEADERBOARD ---------- */

    const weeklyList = await Player.find().sort({ weeklySynergy: -1 });

    const weeklyRank = weeklyList.findIndex(p => p.discordId === user.id);

    let weeklyMsg = "🔥 You are currently **#1** in the weekly leaderboard.";

    if (weeklyRank > 0) {

      const above = weeklyList[weeklyRank - 1];
      const diff = above.weeklySynergy - player.weeklySynergy + 1;

      let name = above.discordName;

      try {
        const member = await ctx.guild.members.fetch(above.discordId);
        name = member.user.username;
      } catch {}

      weeklyMsg = `Need **${diff}** synergy to pass **${name}**`;
    }

    const embed = new EmbedBuilder()
      .setTitle("⚡ Synergy Progress")
      .setColor("Purple")
      .addFields(
        { name: "Season Progress", value: seasonMsg },
        { name: "Weekly Progress", value: weeklyMsg }
      );

    ctx.reply({ embeds: [embed] });

  }

};