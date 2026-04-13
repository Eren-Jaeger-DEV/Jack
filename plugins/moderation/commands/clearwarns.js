const perms = require("../../../bot/utils/permissionUtils");
const Warn = require("../../../bot/database/models/Warn");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "clearwarns",
  category: "moderation",
  description: "Clear all warnings from a user",
  aliases: ["warnsclear","clearwarnings"],
  usage: "/clearwarns @user  |  j clearwarns @user",
  details: "Clears all warnings from a user's record.",

  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all warnings from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Only senior tactical personnel can wipe disciplinary records.');
    }

    let user;

    /* PREFIX */

    if (ctx.type === "prefix") {

      user = ctx.message.mentions.users.first();

      if (!user)
        return ctx.reply('Usage: jack clearwarns @user');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user');

    }

    await Warn.deleteMany({
      userId: user.id,
      guildId: ctx.guild.id
    });

    const embed = new EmbedBuilder()
      .setTitle('🧹 Warnings Cleared')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    ctx.reply({
      content: `✅ Cleared warnings for ${user.tag}`,
      embeds: [embed]
    });

  }

};