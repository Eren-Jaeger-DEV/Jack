const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "clearall",
  category: "moderation",

  data: new SlashCommandBuilder()
    .setName('clearall')
    .setDescription('Delete ALL messages in the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async run(ctx) {

    /* PREFIX PERMISSION CHECK */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ManageMessages))
        return ctx.reply('❌ No permission.');

    }

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages))
      return ctx.reply('❌ I lack permission.');

    ctx.reply("🧹 Clearing channel...");

    const fetched = await ctx.channel.messages.fetch();

    await ctx.channel.bulkDelete(fetched, true).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('🧹 Channel Cleared')
      .addFields(
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'Channel', value: ctx.channel.toString() }
      )
      .setColor('Blue')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};