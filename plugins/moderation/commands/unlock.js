const logger = require("../../../bot/utils/logger");
const { checkUser, checkBot } = require("../../../bot/utils/checkPermission");

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

    await logger(ctx.guild, embed);

  }

};