const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../database/models/Level");
const getLevelFromXP = require("../../utils/getLevelFromXP");

module.exports = {
  name: "removexp",
  category: "admin",
  description: "Remove XP from a user",
  data: new SlashCommandBuilder()
    .setName("removexp")
    .setDescription("Remove XP from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to remove XP from").setRequired(true))
    .addIntegerOption(option => option.setName("amount").setDescription("Amount of XP").setRequired(true)),

  async run(ctx) {
    const target = ctx.options.getUser("user");
    const amount = ctx.options.getInteger("amount");

    const profile = await Level.findOne({ userId: target.id, guildId: ctx.guild.id });
    if (!profile) return ctx.reply({ content: "User has no XP.", ephemeral: true });

    profile.xp = Math.max(0, profile.xp - amount);
    profile.weeklyXp = Math.max(0, profile.weeklyXp - amount);
    profile.level = getLevelFromXP(profile.xp);
    await profile.save();

    return ctx.reply({ content: `✅ Removed ${amount} XP from ${target.tag}. They are now Level ${profile.level} with ${profile.xp} XP.`, ephemeral: true });
  }
};
