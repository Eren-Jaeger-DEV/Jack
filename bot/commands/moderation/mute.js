const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Duration in minutes')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });

    if (!checkBot(interaction.guild, PermissionFlagsBits.ModerateMembers))
      return interaction.reply({ content: '❌ I lack permission.', ephemeral: true });

    await member.timeout(minutes * 60000, 'Muted by moderator');

    await interaction.reply(`🔇 ${user.tag} muted for ${minutes} minutes.`);

    const embed = new EmbedBuilder()
      .setTitle('🔇 User Muted')
      .addFields(
        { name: 'User', value: user.tag },
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Duration', value: `${minutes} minutes` }
      )
      .setColor('Orange')
      .setTimestamp();

    await logger(interaction.guild, embed);
  },

  async prefixExecute(message, args) {
    if (!checkUser(message.member, PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    const minutes = parseInt(args[1]);

    if (!user || !minutes)
      return message.reply('Usage: jack mute @user 10');

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply('User not found.');

    await member.timeout(minutes * 60000);
    message.reply(`🔇 ${user.tag} muted for ${minutes} minutes.`);
  }
};