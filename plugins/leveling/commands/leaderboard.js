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

  async run(ctx, pageOverride = 0) {
    let subCommand = "global";
    let page = pageOverride;

    // Determine subcommand
    if (ctx.isInteraction && ctx.options?.getSubcommand(false)) {
      subCommand = ctx.options.getSubcommand(false);
    } else if (!ctx.isInteraction && ctx.args?.length > 0) {
      const arg = ctx.args[0].toLowerCase();
      if (arg === "weekly" || arg === "global") subCommand = arg;
    }

    const isWeekly = subCommand === "weekly";
    const sortField = isWeekly ? "weeklyXp" : "xp";

    // Fetch total users for pagination metadata
    const totalUsers = await Level.countDocuments({ guildId: ctx.guild.id });
    const totalPages = Math.ceil(totalUsers / 10);

    // Fetch current page's users
    const topUsers = await Level.find({ guildId: ctx.guild.id })
      .sort({ [sortField]: -1 })
      .skip(page * 10)
      .limit(10);

    if (topUsers.length === 0 && page === 0) {
      return ctx.reply({ content: "No one has earned XP yet!", ephemeral: true });
    }

    const medals = ["🥇", "🥈", "🥉"];
    let description = "";

    topUsers.forEach((user, index) => {
      const globalIndex = page * 10 + index;
      const position = (page === 0 && globalIndex < 3) ? medals[globalIndex] : `**#${globalIndex + 1}**`;
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

    // Build pagination buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`leveling_lb_prev_${page}_${subCommand}`)
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`leveling_lb_next_${page}_${subCommand}`)
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1)
    );

    const components = totalPages > 1 ? [row] : [];

    // If it's a real interaction update (from a button), update the message.
    // Otherwise, it's a fresh command run (Slash or Message).
    if (ctx.isInteraction && ctx.deferred) {
      return await ctx.editReply({ embeds: [embed], components });
    } else {
      return ctx.reply({ embeds: [embed], components });
    }
  }
};
