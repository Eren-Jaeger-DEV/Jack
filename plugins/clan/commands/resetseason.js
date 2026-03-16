const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "resetseason",
  category: "clan",
  description: "Reset season and weekly synergy for all players",

  data: new SlashCommandBuilder()
    .setName("resetseason")
    .setDescription("Reset season and weekly synergy for all players")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    const isServerOwner = ctx.guild.ownerId === ctx.user.id;

    const hasPerm =
      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPerm && !isServerOwner)
      return ctx.reply("❌ Only Admins or the Server Owner can reset the season.");

    await Player.updateMany({}, {
      seasonSynergy: 0,
      weeklySynergy: 0
    });

    ctx.reply("🏁 Season reset complete. All synergy has been cleared.");

  }

};