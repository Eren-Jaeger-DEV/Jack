const logger = require('../../utils/logger');
const { checkUser, checkBot } = require('../../utils/checkPermission');
const {
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const Warn = require('../../database/models/Warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply('User not found.');

    if (!checkBot(interaction.guild, PermissionFlagsBits.ModerateMembers))
      return interaction.reply('❌ I lack permission.');

    if (interaction.member.roles.highest.position <= member.roles.highest.position)
      return interaction.reply('❌ Cannot warn this user.');

    const warn = new Warn({
      userId: user.id,
      guildId: interaction.guild.id,
      moderatorId: interaction.user.id,
      reason
    });

    await warn.save();

    await interaction.reply(`⚠️ ${user.tag} warned.\nReason: ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
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
    if (!checkUser(message.member, PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention a user.');

    const reason = args.slice(1).join(' ') || 'No reason';
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply('User not found.');

    if (!checkBot(message.guild, PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ I lack permission.');

    if (message.member.roles.highest.position <= member.roles.highest.position)
      return message.reply('❌ Cannot warn this user.');

    const warn = new Warn({
      userId: user.id,
      guildId: message.guild.id,
      moderatorId: message.author.id,
      reason
    });

    await warn.save();

    await message.reply(`⚠️ ${user.tag} warned.\nReason: ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
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