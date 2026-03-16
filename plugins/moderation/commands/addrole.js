const logger = require("../../../bot/utils/logger");
const { checkUser, checkBot } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "addrole",
  category: "moderation",
  description: "Add a role to a user",

  data: new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Add a role to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to add')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async run(ctx) {

    let user;
    let role;

    /* PREFIX */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ManageRoles))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();
      role = ctx.message.mentions.roles.first();

      if (!user || !role)
        return ctx.reply('Usage: jack addrole @user @role');

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

    await member.roles.add(role);

    ctx.reply(`✅ Added **${role.name}** to ${user.tag}`);

    const embed = new EmbedBuilder()
      .setTitle('➕ Role Added')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Role', value: role.name },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};