const logger = require("../../../bot/utils/logger");
const { checkUser, checkBot } = require("../../../bot/utils/checkPermission");

const {
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const Warn = require("../../../bot/database/models/Warn");

module.exports = {

  name: "warn",
  category: "moderation",
  description: "Warn a user with a reason",
  aliases: ["strike","warning"],
  usage: "/warn @user <reason>  |  j warn @user <reason>",
  details: "Issues a formal warning to a member and stores it in the database.",

  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {

    let user;
    let reason;

    /* ---------- PREFIX COMMAND ---------- */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ModerateMembers))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();
      if (!user)
        return ctx.reply('Usage: jack warn @user reason');

      reason = ctx.args.slice(1).join(' ') || 'No reason';

    }

    /* ---------- SLASH COMMAND ---------- */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');
      reason = ctx.interaction.options.getString('reason');

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.ModerateMembers))
      return ctx.reply('❌ I lack permission.');

    if (ctx.member.roles.highest.position <= member.roles.highest.position)
      return ctx.reply('❌ Cannot warn this user.');

    const warn = new Warn({
      userId: user.id,
      guildId: ctx.guild.id,
      moderatorId: ctx.user.id,
      reason
    });

    await warn.save();

    ctx.reply(`⚠️ ${user.tag} warned.\nReason: ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Orange')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};