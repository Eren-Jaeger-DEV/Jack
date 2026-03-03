const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });

    if (!checkBot(interaction.guild, PermissionFlagsBits.BanMembers))
      return interaction.reply({ content: '❌ I lack permission.', ephemeral: true });

    if (interaction.member.roles.highest.position <= member.roles.highest.position)
      return interaction.reply({ content: '❌ Cannot ban this user.', ephemeral: true });

    await member.ban({ reason });
    await interaction.reply(`🔨 ${user.tag} has been banned.`);

    const embed = new EmbedBuilder()
      .setTitle('🔨 User Banned')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Red')
      .setTimestamp();

    await logger(interaction.guild, embed);
  },

  async prefixExecute(message, args) {
    if (!checkUser(message.member, PermissionFlagsBits.BanMembers))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention a user.');

    const reason = args.slice(1).join(' ') || 'No reason';
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply('User not found.');

    if (!checkBot(message.guild, PermissionFlagsBits.BanMembers))
      return message.reply('❌ I lack permission.');

    if (message.member.roles.highest.position <= member.roles.highest.position)
      return message.reply('❌ Cannot ban this user.');

    await member.ban({ reason });
    message.reply(`🔨 ${user.tag} has been banned.`);

    const embed = new EmbedBuilder()
      .setTitle('🔨 User Banned')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: message.author.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Red')
      .setTimestamp();

    await logger(message.guild, embed);
  }
};