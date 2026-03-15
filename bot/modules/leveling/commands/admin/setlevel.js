const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../database/models/Level");
const xpForLevel = require("../../utils/xpForLevel");

module.exports = {
  name: "setlevel",
  category: "admin",
  description: "Set Level for a user",
  data: new SlashCommandBuilder()
    .setName("setlevel")
    .setDescription("Set Level for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to set level for").setRequired(true))
    .addIntegerOption(option => option.setName("level").setDescription("Level to set").setRequired(true)),

  async run(ctx) {
    const target = ctx.options.getUser("user");
    const level = ctx.options.getInteger("level");
    const requiredXp = xpForLevel(level);

    const profile = await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { xp: requiredXp, level: level, weeklyXp: requiredXp },
      { upsert: true, new: true }
    );

    return ctx.reply({ content: `✅ Set ${target.tag}'s level to ${profile.level}. Total XP is now ${profile.xp}.`, ephemeral: true });
  }
};
