const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "clear",
  category: "moderation",

  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete multiple messages from a channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages (1-100)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async run(ctx) {

    let amount;

    /* PREFIX */

    if (ctx.type === "prefix") {

      if (!checkUser(ctx.member, PermissionFlagsBits.ManageMessages))
        return ctx.reply('❌ No permission.');

      if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages))
        return ctx.reply('❌ I lack permission.');

      amount = parseInt(ctx.args[0]);

      if (!amount || amount < 1 || amount > 100)
        return ctx.reply('Usage: jack clear 10');

    }

    /* SLASH */

    if (ctx.type === "slash") {

      amount = ctx.interaction.options.getInteger('amount');

      if (amount < 1 || amount > 100)
        return ctx.reply('Amount must be between 1 and 100.');

      if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages))
        return ctx.reply('❌ I lack Manage Messages permission.');

    }

    await ctx.channel.bulkDelete(amount, true);

    ctx.reply(`🧹 Deleted ${amount} messages.`);

    const embed = new EmbedBuilder()
      .setTitle('🧹 Messages Cleared')
      .addFields(
        { name: 'Moderator', value: ctx.user.tag },
        { name: 'Channel', value: ctx.channel.toString() },
        { name: 'Amount', value: `${amount}` }
      )
      .setColor('Blue')
      .setTimestamp();

    await logger(ctx.guild, embed);

  }

};