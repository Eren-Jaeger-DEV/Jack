const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../database/models/Level");
const getLevelFromXP = require("../../utils/getLevelFromXP");

module.exports = {
  name: "addxp",
  category: "admin",
  description: "Add XP to a user",
  data: new SlashCommandBuilder()
    .setName("addxp")
    .setDescription("Add XP to a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to add XP to").setRequired(true))
    .addIntegerOption(option => option.setName("amount").setDescription("Amount of XP").setRequired(true)),

  async run(ctx) {
    const target = ctx.options.getUser("user");
    const amount = ctx.options.getInteger("amount");

    const profile = await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { $inc: { xp: amount, weeklyXp: amount } },
      { upsert: true, new: true }
    );

    profile.level = getLevelFromXP(profile.xp);
    await profile.save();

    return ctx.reply({ content: `✅ Added ${amount} XP to ${target.tag}. They are now Level ${profile.level} with ${profile.xp} XP.`, ephemeral: true });
  }
};
