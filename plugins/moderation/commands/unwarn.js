const logger = require("../../../bot/utils/logger");
const { checkUser } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const Warn = require("../../../bot/database/models/Warn");

module.exports = {

  name: "unwarn",
  category: "moderation",
  description: "Remove a warning from a user",
  aliases: ["removewarn","warnremove"],
  usage: "/unwarn @user <warnId>  |  j unwarn @user <warnId>",
  details: "Removes a specific warning from a user's record by warn ID.",

  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to remove warning from')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {

    let user;

    /* PREFIX */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ModerateMembers))
        return ctx.reply('❌ No permission.');

      user = ctx.message.mentions.users.first();

      if (!user)
        return ctx.reply('Usage: jack unwarn @user');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');

    }

    const warn = await Warn.findOneAndDelete({
      userId: user.id,
      guildId: ctx.guild.id
    });

    if (!warn)
      return ctx.reply('No warnings found for this user.');

    ctx.reply(`⚠️ A warning has been removed from ${user.tag}.`);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Warning Removed')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};