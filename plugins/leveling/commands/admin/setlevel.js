const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../bot/database/models/Level");
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
    let target = null;
    let level = 0;

    if (ctx.isInteraction) {
      target = ctx.options.getUser("user");
      level = ctx.options.getInteger("level");
    } else {
      if (ctx.message?.mentions?.users?.size > 0) {
        target = ctx.message.mentions.users.first();
      } else if (ctx.args?.length > 0) {
        target = await ctx.client.users.fetch(ctx.args[0]).catch(() => null);
      }
      level = parseInt(ctx.args[1], 10);
    }

    if (!target) return ctx.reply({ content: "Please provide a valid user.", ephemeral: true });
    if (isNaN(level)) return ctx.reply({ content: "Please provide a valid level.", ephemeral: true });
    const requiredXp = xpForLevel(level);

    const profile = await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { xp: requiredXp, level: level, weeklyXp: requiredXp },
      { upsert: true, new: true }
    );

    return ctx.reply({ content: `✅ Set ${target.tag}'s level to ${profile.level}. Total XP is now ${profile.xp}.`, ephemeral: true });
  }
};
