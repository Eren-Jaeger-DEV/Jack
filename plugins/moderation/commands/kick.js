const logger = require("../../../bot/utils/logger");
const guildLogger = require("../../../bot/utils/guildLogger");
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
  aliases: ["boot","remove"],
  usage: "/kick @user [reason]  |  j kick @user [reason]",
  details: "Kicks a member from the server.",

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
    const user = ctx.options.getUser('user');
    const reason = ctx.options.getString('reason') || 'No reason';

    if (!user) {
      return ctx.reply(`Usage: ${ctx.type === 'prefix' ? 'j ' : '/'}kick @user [reason]`);
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

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};