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

  name: "unban",
  category: "moderation",
  description: "Unban a user from the server",
  aliases: ["pardon","forgive"],
  usage: "/unban <userId>  |  j unban <userId>",
  details: "Unbans a user by their Discord ID.",

  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('User ID to unban')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Strategic reprieves are reserved for command personnel.');
    }

    let userId;

    /* PREFIX */

    if (ctx.type === "prefix") {

      userId = ctx.args[0];

      if (!userId)
        return ctx.reply('Usage: jack unban USER_ID');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      userId = ctx.interaction.options.getString('userid');

    }

    if (!checkBot(ctx.guild, PermissionFlagsBits.BanMembers))
      return ctx.reply('❌ I lack permission.');

    const bans = await ctx.guild.bans.fetch();
    const bannedUser = bans.get(userId);

    if (!bannedUser)
      return ctx.reply('User is not banned.');

    await ctx.guild.members.unban(userId);

    ctx.reply(`🔓 ${bannedUser.user.tag} has been unbanned.`);

    const embed = new EmbedBuilder()
      .setTitle('🔓 User Unbanned')
      .addFields(
        { name: 'User', value: `${bannedUser.user.tag} (${userId})` },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};