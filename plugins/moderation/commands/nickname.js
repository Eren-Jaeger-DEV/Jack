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

  name: "nickname",
  category: "moderation",
  description: "Change a user's nickname",
  aliases: ['nick', 'setnick', 'rename'],
  usage: '/nickname @user <name>  |  j nickname @user <name>',
  details: "Changes a member\'s displayed server nickname.",

  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Change a user nickname')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose nickname will be changed')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nickname')
        .setDescription('New nickname')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Tactical identity reassignment is restricted to command personnel.');
    }

    let user;
    let nickname;

    /* PREFIX */

    if (ctx.type === "prefix") {

      user = ctx.message.mentions.users.first();

      if (!user)
        return ctx.reply('Usage: jack nickname @user NewName');

      nickname = ctx.args.slice(1).join(" ");

      if (!nickname)
        return ctx.reply('Provide a nickname.');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');
      nickname = ctx.interaction.options.getString('nickname');

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageNicknames))
      return ctx.reply('❌ I lack permission.');

    if (ctx.member.roles.highest.position <= member.roles.highest.position)
      return ctx.reply('❌ Cannot change nickname of this user.');

    await member.setNickname(nickname);

    ctx.reply(`✏️ Nickname for ${user.tag} changed to **${nickname}**`);

    const embed = new EmbedBuilder()
      .setTitle('✏️ Nickname Changed')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'New Nickname', value: nickname }
      )
      .setColor('Blue')
      .setTimestamp();

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};