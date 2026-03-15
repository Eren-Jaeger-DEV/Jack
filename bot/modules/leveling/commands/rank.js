const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Level = require("../../../database/models/Level");
const rankCard = require("../rankCard");

module.exports = {
  name: "rank",
  category: "leveling",
  description: "Show your or another user's rank card",
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your current level and XP")
    .addUserOption(option => 
      option.setName("user").setDescription("The user to check").setRequired(false)
    ),

  async run(ctx) {
    const targetUser = ctx.options?.getUser("user") || ctx.user;

    const member = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return ctx.reply({ content: "Could not find that member in this server.", ephemeral: true });
    }

    if (targetUser.bot) {
      return ctx.reply({ content: "Bots don't have levels!", ephemeral: true });
    }

    let profile = await Level.findOne({
      userId: targetUser.id,
      guildId: ctx.guild.id
    });

    if (!profile) {
      profile = {
        userId: targetUser.id,
        guildId: ctx.guild.id,
        xp: 0,
        weeklyXp: 0,
        level: 0,
        background: ""
      };
    }

    // Calculate Ranks
    const serverRank = await Level.countDocuments({
      guildId: ctx.guild.id,
      xp: { $gt: profile.xp }
    }) + 1;

    const weeklyRank = await Level.countDocuments({
      guildId: ctx.guild.id,
      weeklyXp: { $gt: profile.weeklyXp }
    }) + 1;

    await ctx.deferReply();

    const buffer = await rankCard(member, profile, serverRank, weeklyRank);
    const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });

    return ctx.editReply({ files: [attachment] });
  }
};
