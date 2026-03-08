const Player = require("../../database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "deleteplayer",
  category: "clan",

  data: new SlashCommandBuilder()
    .setName("deleteplayer")
    .setDescription("Delete a player's clan profile")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Player to delete")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    let user;

    /* PREFIX COMMAND */

    if (ctx.type === "prefix") {

      if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator))
        return ctx.reply("❌ You do not have permission.");

      user = ctx.message.mentions.users.first();

      if (!user)
        return ctx.reply("Usage: jack deleteplayer @user");

    }

    /* SLASH COMMAND */

    if (ctx.type === "slash") {
      user = ctx.interaction.options.getUser("user");
    }

    const player = await Player.findOne({
      discordId: user.id
    });

    if (!player)
      return ctx.reply("❌ Player profile not found.");

    await Player.deleteOne({
      discordId: user.id
    });

    ctx.reply(`🗑️ Player profile for **${user.tag}** has been deleted.`);

  }

};