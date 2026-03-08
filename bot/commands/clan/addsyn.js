const Player = require("../../database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "addsyn",
  category: "clan",

  data: new SlashCommandBuilder()
    .setName("addsyn")
    .setDescription("Add synergy points to a player")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Player")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("points")
        .setDescription("Synergy points")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {

    const isServerOwner = ctx.guild.ownerId === ctx.user.id;

    const hasPerm =
      ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPerm && !isServerOwner)
      return ctx.reply("❌ Only Moderators, Admins, or the Server Owner can modify synergy.");

    let user;
    let points;

    /* SLASH */
    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser("user");
      points = ctx.interaction.options.getInteger("points");

    }

    /* PREFIX */
    if (ctx.type === "prefix") {

      user = ctx.message.mentions.users.first();
      points = parseInt(ctx.args[1]);

      if (!user || !points)
        return ctx.reply("Usage: jack addsyn @user 200");

    }

    const player = await Player.findOne({ discordId: user.id });

    if (!player)
      return ctx.reply("❌ Player not registered.");

    player.seasonSynergy += points;
    player.weeklySynergy += points;

    await player.save();

    ctx.reply(`⚡ Added **${points} synergy** to **${user.tag}**`);

  }

};