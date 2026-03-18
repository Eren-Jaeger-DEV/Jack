const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "ign",
  category: "clan",
  description: "View a player's in-game name",
  aliases: ['gamename', 'ingamename'],
  usage: "/ign [@user]  |  j ign [@user]",
  details: "Displays the in-game name of a registered BGMI player.",

  data: new SlashCommandBuilder()
    .setName("ign")
    .setDescription("View a player's in-game name")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Player")
        .setRequired(false)
    ),

  async run(ctx) {

    let user;

    /* SLASH */

    if (ctx.type === "slash") {
      user = ctx.options.getUser("user") || ctx.user;
    }

    /* PREFIX */

    if (ctx.type === "prefix") {
      user = ctx.message.mentions.users.first() || ctx.user;
    }

    const player = await Player.findOne({
      discordId: user.id
    });

    if (!player)
      return ctx.reply("❌ Player not registered.");

    ctx.reply(`🎮 **${user.username}'s IGN:** ${player.ign}`);

  }

};