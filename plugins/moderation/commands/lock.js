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

  name: "lock",
  category: "moderation",
  description: "Lock the current channel",
  aliases: ["lockdown","lockchannel"],
  usage: "/lock  |  j lock",
  details: "Locks the current channel so members cannot send messages.",

  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Only tactical management personnel can initiate channel lockdown.');
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

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};