const logger = require("../../../bot/utils/logger");
const { checkUser, checkBot } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "kick",
  category: "moderation",
  description: "Kick a member from the server",

  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async run(ctx) {

    let user;
    let reason;

    /* ---------- PREFIX COMMAND ---------- */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.KickMembers))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();
      if (!user)
        return ctx.reply('Usage: jack kick @user [reason]');

      reason = ctx.args.slice(1).join(' ') || 'No reason';

    }

    /* ---------- SLASH COMMAND ---------- */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');
      reason = ctx.interaction.options.getString('reason') || 'No reason';

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.KickMembers))
      return ctx.reply('❌ I lack permission.');

    if (ctx.member.roles.highest.position <= member.roles.highest.position)
      return ctx.reply('❌ Cannot kick this user.');

    await member.kick(reason);

    ctx.reply(`👢 ${user.tag} kicked.`);

    const embed = new EmbedBuilder()
      .setTitle('👢 User Kicked')
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