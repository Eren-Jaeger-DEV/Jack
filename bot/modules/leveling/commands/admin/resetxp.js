const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../database/models/Level");

module.exports = {
  name: "resetxp",
  category: "admin",
  description: "Reset all XP for a user",
  data: new SlashCommandBuilder()
    .setName("resetxp")
    .setDescription("Reset all XP for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to reset XP for").setRequired(true)),

  async run(ctx) {
    const target = ctx.options.getUser("user");

    await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { xp: 0, weeklyXp: 0, level: 0 },
      { upsert: true }
    );

    return ctx.reply({ content: `✅ Reset XP and level to 0 for ${target.tag}.`, ephemeral: true });
  }
};
