const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply('User not found.');
    if (!checkBot(interaction.guild, PermissionFlagsBits.KickMembers))
      return interaction.reply('❌ I lack permission.');
    if (interaction.member.roles.highest.position <= member.roles.highest.position)
      return interaction.reply('❌ Cannot kick this user.');

    await member.kick(reason);
    await interaction.reply(`👢 ${user.tag} kicked.`);

    const embed = new EmbedBuilder()
      .setTitle('👢 User Kicked')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Orange')
      .setTimestamp();

    await logger(interaction.guild, embed);
  },

  async prefixExecute(message, args) {
    if (!checkUser(message.member, PermissionFlagsBits.KickMembers))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention user.');

    const reason = args.slice(1).join(' ') || 'No reason';
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    if (!member) return message.reply('User not found.');
    if (!checkBot(message.guild, PermissionFlagsBits.KickMembers))
      return message.reply('❌ I lack permission.');
    if (message.member.roles.highest.position <= member.roles.highest.position)
      return message.reply('❌ Cannot kick this user.');

    await member.kick(reason);
    await message.reply(`👢 ${user.tag} kicked.`);

    const embed = new EmbedBuilder()
      .setTitle('👢 User Kicked')
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})` },
        { name: 'Moderator', value: message.author.tag },
        { name: 'Reason', value: reason }
      )
      .setColor('Orange')
      .setTimestamp();

    await logger(message.guild, embed);
  }
};