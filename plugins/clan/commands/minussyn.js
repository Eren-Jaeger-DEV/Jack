const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "minussyn",
  category: "clan",
  description: "Remove synergy points from a player",
  aliases: ["syn-","removesynergy","rmsyn"],
  usage: "/minussyn @user <points>  |  j minussyn @user <points>",
  details: "Deducts synergy points from a registered clan player.",

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

    if (!hasPerm && !isServerOwner) {
      return ctx.reply("❌ Only Moderators, Admins, or the Server Owner can modify synergy.");
    }

    let user;
    let points;

    /* SLASH */

    if (ctx.options?.getUser) {
      user = ctx.options.getUser("user");
      points = ctx.options.getInteger("points");
    }

    /* PREFIX */

    if (!user) {
      user = ctx.message?.mentions?.users?.first();
      points = parseInt(ctx.args?.[1]);
    }

    if (!user || !points) {
      return ctx.reply("Usage: `jack minussyn @user 200`");
    }

    const player = await Player.findOne({ discordId: user.id });

    if (!player) {
      return ctx.reply("❌ Player not registered.");
    }

    player.seasonSynergy -= points;
    player.weeklySynergy -= points;

    if (player.seasonSynergy < 0) player.seasonSynergy = 0;
    if (player.weeklySynergy < 0) player.weeklySynergy = 0;

    await player.save();

    await ctx.reply(`⚠️ Removed **${points} synergy** from **${user.tag}**`);

  }

};