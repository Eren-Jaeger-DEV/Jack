const logger = require('../../utils/logger');
const { checkUser } = require('../../utils/checkPermission');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to unmute')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);

    await member.timeout(null);

    await interaction.reply(`🔊 ${user.tag} unmuted.`);

    const embed = new EmbedBuilder()
      .setTitle('🔊 User Unmuted')
      .addFields(
        { name: 'User', value: user.tag },
        { name: 'Moderator', value: interaction.user.tag }
      )
      .setColor('Green')
      .setTimestamp();

    await logger(interaction.guild, embed);
  },

  async prefixExecute(message) {
    if (!checkUser(message.member, PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention a user.');

    const member = await message.guild.members.fetch(user.id);
    await member.timeout(null);

    message.reply(`🔊 ${user.tag} unmuted.`);
  }
};