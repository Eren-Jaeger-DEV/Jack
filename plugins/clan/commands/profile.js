const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "profile",
  category: "clan",
  description: "Show BGMI player profile",
  aliases: ["p","playerprofile"],
  usage: '/profile [@user]  |  j profile [@user]',
  details: 'Shows a player's full BGMI profile card including IGN, UID, synergy, and level.',

  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show BGMI player profile")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Profile")
        .setRequired(false)
    ),

  async run(ctx) {

    /* GET TARGET USER */

    let user =
      ctx.options?.getUser?.("user") ||
      ctx.message?.mentions?.users?.first() ||
      ctx.user;

    const player = await Player.findOne({ discordId: user.id });

    if (!player)
      return ctx.reply("❌ Player not registered.");

    /* GET CURRENT USERNAME */

    let name = player.discordName;

    try {
      const member = await ctx.guild.members.fetch(player.discordId);
      name = member.user.username;
    } catch {}

    /* SEASON RANK */

    const seasonList = await Player.find().sort({ seasonSynergy: -1 });
    const seasonRank = seasonList.findIndex(p => p.discordId === user.id) + 1;

    /* WEEKLY RANK */

    const weeklyList = await Player.find().sort({ weeklySynergy: -1 });
    const weeklyRank = weeklyList.findIndex(p => p.discordId === user.id) + 1;

    /* MEDAL SYSTEM */

    const rankDisplay = (rank) => {
      if (rank === 1) return "🥇 #1";
      if (rank === 2) return "🥈 #2";
      if (rank === 3) return "🥉 #3";
      return `#${rank}`;
    };

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${name}'s BGMI Profile`)
      .setColor("Blue")
      .addFields(
        { name: "IGN", value: player.ign || "N/A", inline: true },
        { name: "UID", value: player.uid || "N/A", inline: true },
        { name: "Account Level", value: `${player.accountLevel || "N/A"}`, inline: true },

        { name: "Preferred Modes", value: player.preferredModes?.join(", ") || "N/A" },

        { name: "Season Synergy", value: `${player.seasonSynergy || 0}`, inline: true },
        { name: "Season Rank", value: rankDisplay(seasonRank), inline: true },

        { name: "Weekly Synergy", value: `${player.weeklySynergy || 0}`, inline: true },
        { name: "Weekly Rank", value: rankDisplay(weeklyRank), inline: true }
      )
      .setFooter({ text: "Jack Clan System" });

    if (player.screenshot)
      embed.setImage(player.screenshot);

    await ctx.reply({ embeds: [embed] });

  }

};