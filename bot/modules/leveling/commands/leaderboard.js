const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Level = require("../../../database/models/Level");

module.exports = {
  name: "leaderboard",
  category: "leveling",
  description: "View the server XP leaderboard",
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the server XP leaderboard")
    .addSubcommand(subcmd => 
      subcmd.setName("global").setDescription("View the all-time XP leaderboard")
    )
    .addSubcommand(subcmd => 
      subcmd.setName("weekly").setDescription("View the weekly XP leaderboard")
    ),

  async run(ctx) {
    const subCommand = ctx.options?.getSubcommand() || "global";
    const isWeekly = subCommand === "weekly";
    const sortField = isWeekly ? "weeklyXp" : "xp";
    const title = isWeekly ? "Weekly Leaderboard" : "Global Leaderboard";

    const topUsers = await Level.find({ guildId: ctx.guild.id })
      .sort({ [sortField]: -1 })
      .limit(10);

    if (topUsers.length === 0) {
      return ctx.reply({ content: "No one has earned XP yet!", ephemeral: true });
    }

    const medals = ["🥇", "🥈", "🥉"];
    let description = "";

    topUsers.forEach((user, index) => {
      const position = index < 3 ? medals[index] : `**#${index + 1}**`;
      const xpValue = isWeekly ? user.weeklyXp : user.xp;
      description += `${position} <@${user.userId}> — Level ${user.level} (${xpValue.toLocaleString()} XP)\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Server ${title}`)
      .setColor("#FFD700")
      .setDescription(description)
      .setFooter({ text: "JACK × XZEEMO" });

    return ctx.reply({ embeds: [embed] });
  }
};
