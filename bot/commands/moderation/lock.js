const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "lock",
  category: "moderation",

  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async run(ctx) {

    /* PREFIX PERMISSION CHECK */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ManageChannels))
        return ctx.reply('❌ No permission.');

    }

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageChannels))
      return ctx.reply('❌ I lack permission.');

    await ctx.channel.permissionOverwrites.edit(
      ctx.guild.roles.everyone,
      { SendMessages: false }
    );

    ctx.reply('🔒 Channel locked.');

    const embed = new EmbedBuilder()
      .setTitle('🔒 Channel Locked')
      .addFields(
        { name: 'Channel', value: ctx.channel.toString() },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Red')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};