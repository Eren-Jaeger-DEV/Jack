const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Level = require("../../../bot/database/models/Level");
const xpForLevel = require("../utils/xpForLevel");

module.exports = {
  name: "leaderboard",
  category: "leveling",
  description: "View the server XP leaderboard",
  aliases: ["lb", "top", "levels"],
  usage: "/leaderboard  |  j leaderboard",
  details: "Shows the top XP leaderboard for the server, sorted by level and XP.",
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
    let subCommand = "global";

    if (ctx.isInteraction && ctx.options?.getSubcommand(false)) {
      subCommand = ctx.options.getSubcommand(false);
    } else if (!ctx.isInteraction && ctx.args?.length > 0) {
      subCommand = ctx.args[0].toLowerCase();
    }

    const isWeekly = subCommand === "weekly";
    const sortField = isWeekly ? "weeklyXp" : "xp";

    // Fetch top 10 users
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
      const nextLevelXP = xpForLevel(user.level + 1);
      
      // Amari-style formatting
      description += `${position} 🔸 <@${user.userId}>\n`;
      description += `ㅤLevel: \`${user.level}\` \n`;
      description += `ㅤExp: \`${xpValue.toLocaleString()} / ${nextLevelXP.toLocaleString()}\` \n\n`;
    });

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Leaderboard", iconURL: ctx.client.user.displayAvatarURL() })
      .setTitle(`${ctx.guild.name} Server`)
      .setColor("#FFD700")
      .setThumbnail(ctx.guild.iconURL({ dynamic: true, size: 512 }))
      .setDescription(description.trim());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("view_full_lb")
        .setLabel("Full Leaderboard")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🏆")
    );

    return ctx.reply({ embeds: [embed], components: [row] });
  }
};
