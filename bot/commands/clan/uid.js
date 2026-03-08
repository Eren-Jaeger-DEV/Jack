const Player = require("../../database/models/Player");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "uid",
  category: "clan",

  data: new SlashCommandBuilder()
    .setName("uid")
    .setDescription("View a player's BGMI UID")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Player")
        .setRequired(false)
    ),

  async run(ctx) {

    let user;

    /* SLASH */

    if (ctx.type === "slash")
      user = ctx.interaction.options.getUser("user") || ctx.user;

    /* PREFIX */

    if (ctx.type === "prefix")
      user = ctx.message.mentions.users.first() || ctx.user;

    const player = await Player.findOne({
      discordId: user.id
    });

    if (!player)
      return ctx.reply("❌ Player not registered.");

    ctx.reply(`🆔 **${user.username}'s UID:** ${player.uid}`);

  }

};