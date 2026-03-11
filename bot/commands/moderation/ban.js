const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "ban",
  category: "moderation",
  description: "Ban a member from the server",

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async run(ctx) {

    let user;
    let reason;

    /* ---------- PREFIX COMMAND ---------- */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.BanMembers))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();
      if (!user) return ctx.reply('Usage: jack ban @user [reason]');

      reason = ctx.args.slice(1).join(' ') || 'No reason';

    }

    /* ---------- SLASH COMMAND ---------- */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');
      reason = ctx.interaction.options.getString('reason') || 'No reason';

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);
    if (!member) return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.BanMembers))
      return ctx.reply('❌ I lack permission.');

    if (ctx.member.roles.highest.position <= member.roles.highest.position)
      return ctx.reply('❌ Cannot ban this user.');

    await member.ban({ reason });

    ctx.reply(`🔨 ${user.tag} has been banned.`);

    const embed = new EmbedBuilder()
      .setTitle('🔨 User Banned')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Red')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};