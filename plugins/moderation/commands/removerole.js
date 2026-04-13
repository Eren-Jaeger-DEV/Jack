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

  name: "removerole",
  category: "moderation",
  description: "Remove a role from a user",
  aliases: ["rr-role","takerole","roledel"],
  usage: "/removerole @user @role  |  j removerole @user @role",
  details: "Removes a role from a member.",

  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to remove')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Role management is restricted to command personnel.');
    }

    let user;
    let role;

    /* PREFIX */

    if (ctx.type === "prefix") {

      user = ctx.message.mentions.users.first();
      role = ctx.message.mentions.roles.first();

      if (!user || !role)
        return ctx.reply('Usage: jack removerole @user @role');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');
      role = ctx.interaction.options.getRole('role');

    }

    const member = await ctx.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return ctx.reply('User not found.');

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageRoles))
      return ctx.reply('❌ I lack permission.');

    await member.roles.remove(role);

    ctx.reply(`➖ Removed **${role.name}** from ${user.tag}`);

    const embed = new EmbedBuilder()
      .setTitle('➖ Role Removed')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Role', value: role.name },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Orange')
      .setTimestamp();

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};