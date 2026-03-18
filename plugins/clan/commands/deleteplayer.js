const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "deleteplayer",
  category: "clan",
  description: "Delete a player's clan profile",
  aliases: ['delplayer', 'removeplayer'],
  usage: '/deleteplayer @user  |  j deleteplayer @user',
  details: 'Permanently removes a player\'s clan profile from the database.',

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

    /* SLASH */

    if (ctx.options?.getUser) {
      user = ctx.options.getUser("user");
    }

    /* PREFIX */

    if (!user) {

      if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return ctx.reply("❌ You do not have permission.");
      }

      user = ctx.message?.mentions?.users?.first();

      if (!user) {
        return ctx.reply("Usage: `jack deleteplayer @user`");
      }

    }

    const player = await Player.findOne({
      discordId: user.id
    });

    if (!player) {
      return ctx.reply("❌ Player profile not found.");
    }

    await Player.deleteOne({
      discordId: user.id
    });

    await ctx.reply(`🗑️ Player profile for **${user.tag}** has been deleted.`);

  }

};