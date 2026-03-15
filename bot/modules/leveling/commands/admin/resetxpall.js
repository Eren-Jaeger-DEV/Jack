const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../database/models/Level");

module.exports = {
  name: "resetxpall",
  category: "admin",
  description: "Reset ALL XP for EVERYONE in the server",
  data: new SlashCommandBuilder()
    .setName("resetxpall")
    .setDescription("Reset ALL XP for EVERYONE in the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    await Level.updateMany(
      { guildId: ctx.guild.id },
      { xp: 0, weeklyXp: 0, level: 0 }
    );

    return ctx.reply({ content: "🚨 All XP, Weekly XP, and Levels have been reset for the entire server.", ephemeral: true });
  }
};
