const Warn = require("../../../bot/database/models/Warn");
const { checkUser } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "warnings",
  category: "moderation",
  description: "View warnings for a user",
  aliases: ["warns","checkwarns"],
  usage: "/warnings @user  |  j warnings @user",
  details: "Shows all recorded warnings for a member.",

  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {

    let user;

    /* ---------- PREFIX ---------- */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ModerateMembers))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();

      if (!user)
        return ctx.reply('Usage: jack warnings @user');

    }

    /* ---------- SLASH ---------- */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');

    }

    const warns = await Warn.find({
      userId: user.id,
      guildId: ctx.guild.id
    });

    if (!warns.length)
      return ctx.reply(`${user.tag} has no warnings.`);

    const list = warns
      .map((w, i) => `${i + 1}. ${w.reason}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${user.tag}`)
      .setDescription(list)
      .setColor('Orange')
      .setTimestamp();

    ctx.reply({ embeds: [embed] });

  }

};