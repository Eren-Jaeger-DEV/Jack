const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete multiple messages from a channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages (1-100)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // SLASH COMMAND
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: 'Amount must be between 1 and 100.',
        ephemeral: true
      });
    }

    if (!checkBot(interaction.guild, PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ I lack Manage Messages permission.',
        ephemeral: true
      });
    }

    await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
      content: `🧹 Deleted ${amount} messages.`,
      ephemeral: true
    });

    // LOGGING
    const embed = new EmbedBuilder()
      .setTitle('🧹 Messages Cleared')
      .addFields(
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Channel', value: interaction.channel.toString() },
        { name: 'Amount', value: `${amount}` }
      )
      .setColor('Blue')
      .setTimestamp();

    await logger(interaction.guild, embed);
  },

  // PREFIX COMMAND
  async prefixExecute(message, args) {
    if (!checkUser(message.member, PermissionFlagsBits.ManageMessages))
      return message.channel.send('❌ No permission.');

    if (!checkBot(message.guild, PermissionFlagsBits.ManageMessages))
      return message.channel.send('❌ I lack permission.');

    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100)
      return message.channel.send('Usage: jack clear 10');

    await message.channel.bulkDelete(amount, true);

    // IMPORTANT: send new message (not reply)
    await message.channel.send(`🧹 Deleted ${amount} messages.`);

    const embed = new EmbedBuilder()
      .setTitle('🧹 Messages Cleared')
      .addFields(
        { name: 'Moderator', value: message.author.tag },
        { name: 'Channel', value: message.channel.toString() },
        { name: 'Amount', value: `${amount}` }
      )
      .setColor('Blue')
      .setTimestamp();

    await logger(message.guild, embed);
  }
};