const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../database/models/Level");
const getLevelFromXP = require("../../utils/getLevelFromXP");

module.exports = {
  name: "setxp",
  category: "admin",
  description: "Set XP for a user",
  data: new SlashCommandBuilder()
    .setName("setxp")
    .setDescription("Set XP for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to set XP for").setRequired(true))
    .addIntegerOption(option => option.setName("amount").setDescription("Amount of XP").setRequired(true)),

  async run(ctx) {
    const target = ctx.options.getUser("user");
    const amount = ctx.options.getInteger("amount");

    const profile = await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { xp: amount, weeklyXp: amount, level: getLevelFromXP(amount) },
      { upsert: true, new: true }
    );

    return ctx.reply({ content: `✅ Set ${target.tag}'s XP to ${profile.xp} (Level ${profile.level}).`, ephemeral: true });
  }
};
