const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Level = require("../../../bot/database/models/Level");
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
    let targetUser = ctx.user;

    // Handle slash options OR prefix mentions/args
    if (ctx.isInteraction && ctx.options?.getUser("user")) {
      targetUser = ctx.options.getUser("user");
    } else if (!ctx.isInteraction && ctx.message?.mentions?.users?.size > 0) {
      targetUser = ctx.message.mentions.users.first();
    } else if (!ctx.isInteraction && ctx.args?.length > 0) {
      targetUser = await ctx.client.users.fetch(ctx.args[0]).catch(() => ctx.user);
    }

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

    // Send loading message for prefix or defer for slash
    let loadingMsg = null;
    if (ctx.isInteraction) {
      await ctx.defer();
    } else {
      loadingMsg = await ctx.reply("⏳ Generating rank card...");
    }

    const buffer = await rankCard(member, profile, serverRank, weeklyRank);
    const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });

    // Send reply
    if (ctx.isInteraction) {
      return ctx.interaction.editReply({ files: [attachment] });
    } else {
      if (loadingMsg && loadingMsg.deletable) await loadingMsg.delete().catch(() => null);
      return ctx.reply({ files: [attachment] });
    }
  }
};
