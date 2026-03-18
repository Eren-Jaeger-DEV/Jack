const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "addsyn",
  category: "clan",
  description: "Add synergy points to a player",
  aliases: ["syn+","addsynergy"],
  usage: '/addsyn @user <points>  |  j addsyn @user <points>',
  details: 'Adds synergy points to a registered clan player.',

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
      return ctx.reply("Usage: `jack addsyn @user 200`");
    }

    const player = await Player.findOne({ discordId: user.id });

    if (!player) {
      return ctx.reply("❌ Player not registered.");
    }

    player.seasonSynergy += points;
    player.weeklySynergy += points;

    await player.save();

    await ctx.reply(`⚡ Added **${points} synergy** to **${user.tag}**`);

  }

};