const logger = require('../../../utils/logger');
const guildLogger = require("../../../bot/utils/guildLogger");
const perms = require("../../../bot/utils/permissionUtils");
const { checkBot } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "unmute",
  category: "moderation",
  description: "Remove timeout from a member",
  aliases: ["untimeout","unsilence"],
  usage: "/unmute @user  |  j unmute @user",
  details: "Removes a timeout from a member early.",

  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to unmute')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** You lack the disciplinary authority for this action.');
    }

    let user;

    /* PREFIX */

    if (ctx.type === "prefix") {

      user = ctx.message.mentions.users.first();

      if (!user)
        return ctx.reply('Usage: jack unmute @user');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.ModerateMembers))
      return ctx.reply('❌ I lack permission.');

    await member.timeout(null);

    ctx.reply(`🔊 ${user.tag} has been unmuted.`);

    const embed = new EmbedBuilder()
      .setTitle('🔊 User Unmuted')
      .addFields(
        { name: 'User', value: user.tag },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};