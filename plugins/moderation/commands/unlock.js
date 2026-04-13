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

  name: "unlock",
  category: "moderation",
  description: "Unlock the current channel",
  aliases: ["unlockchannel","open"],
  usage: "/unlock  |  j unlock",
  details: "Unlocks a previously locked channel so members can speak again.",

  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Only tactical management personnel can lift channel lockdowns.');
    }

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageChannels))
      return ctx.reply('❌ I lack permission.');

    await ctx.channel.permissionOverwrites.edit(
      ctx.guild.roles.everyone,
      { SendMessages: true }
    );

    ctx.reply('🔓 Channel unlocked.');

    const embed = new EmbedBuilder()
      .setTitle('🔓 Channel Unlocked')
      .addFields(
        { name: 'Channel', value: ctx.channel.toString() },
        { name: 'Moderator', value: ctx.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    await guildLogger.send(ctx.guild, embed, 'mod');

  }

};