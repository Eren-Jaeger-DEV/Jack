const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../bot/database/models/Level");

module.exports = {
  name: "xpresetweekly",
  category: "admin",
  description: "Reset weekly XP for EVERYONE in the server",
  data: new SlashCommandBuilder()
    .setName("xpresetweekly")
    .setDescription("Reset weekly XP for EVERYONE in the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    await Level.updateMany(
      { guildId: ctx.guild.id },
      { weeklyXp: 0 }
    );

    return ctx.reply({ content: "⏳ Weekly XP has been reset for the entire server.", ephemeral: true });
  }
};
