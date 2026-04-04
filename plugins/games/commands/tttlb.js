const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const TicTacToeStats = require("../../../bot/database/models/TicTacToeStats");

module.exports = {
  name: "tttlb",
  category: "games",
  description: "View the TicTacToe leaderboard",
  aliases: ["tttleaderboard", "ttt-top"],
  usage: "/tttlb  |  j tttlb",
  details: "Shows the top 10 TicTacToe players based on wins.",
  
  data: new SlashCommandBuilder()
    .setName("tttlb")
    .setDescription("View the TicTacToe leaderboard"),

  async run(ctx) {
    // Fetch top 10 players by wins
    const topPlayers = await TicTacToeStats.find()
      .sort({ wins: -1 })
      .limit(10);

    if (topPlayers.length === 0) {
      return ctx.reply({ content: "No TicTacToe matches have been recorded yet!", ephemeral: true });
    }

    const medals = ["🥇", "🥈", "🥉"];
    let description = "";

    topPlayers.forEach((stats, index) => {
      const position = index < 3 ? medals[index] : `**#${index + 1}**`;
      const winRate = stats.wins + stats.losses + stats.draws > 0 
        ? ((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100).toFixed(1)
        : 0;

      description += `${position} 🔸 <@${stats.userId}>\n`;
      description += `ㅤWins: \`${stats.wins}\` | Losses: \`${stats.losses}\` | Draws: \`${stats.draws}\` \n`;
      description += `ㅤWin Rate: \`${winRate}%\` \n\n`;
    });

    const embed = new EmbedBuilder()
      .setAuthor({ name: "TicTacToe Leaderboard", iconURL: ctx.client.user.displayAvatarURL() })
      .setTitle("🏆 Top Players")
      .setColor("#5865F2") // Blurple
      .setThumbnail("https://cdn.discordapp.com/emojis/1000000000000000000.png") // Placeholder or actual emoji if available
      .setDescription(description.trim())
      .setFooter({ text: "Only PvP games are recorded for the leaderboard." })
      .setTimestamp();

    return ctx.reply({ embeds: [embed] });
  }
};
