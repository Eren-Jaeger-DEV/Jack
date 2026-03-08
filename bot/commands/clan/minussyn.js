const Player = require("../../database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "minussyn",
  category: "clan",

  data: new SlashCommandBuilder()
    .setName("minussyn")
    .setDescription("Remove synergy points from a player")
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
        return ctx.reply("Usage: jack minussyn @user 200");

    }

    const player = await Player.findOne({ discordId: user.id });

    if (!player)
      return ctx.reply("❌ Player not registered.");

    player.seasonSynergy -= points;
    player.weeklySynergy -= points;

    if (player.seasonSynergy < 0) player.seasonSynergy = 0;
    if (player.weeklySynergy < 0) player.weeklySynergy = 0;

    await player.save();

    ctx.reply(`⚠️ Removed **${points} synergy** from **${user.tag}**`);

  }

};