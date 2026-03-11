const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "mute",
  category: "moderation",
  description: "Timeout a member for a specified duration",

  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Duration in minutes')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {

    let user;
    let minutes;

    /* PREFIX */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ModerateMembers))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();
      minutes = parseInt(ctx.args[1]);

      if (!user || !minutes)
        return ctx.reply('Usage: jack mute @user 10');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');
      minutes = ctx.interaction.options.getInteger('minutes');

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.ModerateMembers))
      return ctx.reply('❌ I lack permission.');

    await member.timeout(minutes * 60000, 'Muted by moderator');

    ctx.reply(`🔇 ${user.tag} muted for ${minutes} minutes.`);

    const embed = new EmbedBuilder()
      .setTitle('🔇 User Muted')
      .addFields(
        { name: 'User', value: user.tag },
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'Duration', value: `${minutes} minutes` }
      )
      .setColor('Orange')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};