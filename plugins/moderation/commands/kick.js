const logger = require('../../../utils/logger');
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
    let user;
    let reason;

    /* ---------- PREFIX COMMAND ---------- */
    if (ctx.type === "prefix") {
      const userArg = ctx.args[0];
      if (!userArg) return ctx.reply('Usage: j kick @user [reason]');
      
      const mentionMatch = userArg.match(/<@!?(\d+)>/);
      const id = mentionMatch ? mentionMatch[1] : (userArg.match(/^\d{17,19}$/) ? userArg : null);
      
      if (!id) return ctx.reply('Usage: j kick @user [reason]');

      user = ctx.client.users.cache.get(id) || ctx.message.mentions.users.get(id) || { id, tag: "Unknown User" };
      reason = ctx.args.slice(1).join(' ') || 'No reason';
    } 
    /* ---------- SLASH COMMAND ---------- */
    else {
      user = ctx.options.getUser('user');
      reason = ctx.options.getString('reason') || 'No reason';
    }

    if (!user) {
      return ctx.reply(`Usage: ${ctx.type === 'prefix' ? 'j ' : '/'}kick @user [reason]`);
    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    const targetUser = member.user;

    if (!checkBot(ctx.guild, PermissionFlagsBits.KickMembers))
      return ctx.reply('❌ I lack permission.');

    if (ctx.member.roles.highest.position <= member.roles.highest.position)
      return ctx.reply('❌ Cannot kick this user.');

    await member.kick(reason);

    ctx.reply(`👢 ${targetUser.tag} kicked.`);

    const embed = new EmbedBuilder()
      .setTitle('👢 User Kicked')
      .addFields(
        { name: 'User', value: `${targetUser.tag} (${targetUser.id})` },
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Orange')
      .setTimestamp();

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};