const Warn = require('../../database/models/Warn');
const { checkUser } = require('../../utils/checkPermission');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all warnings')
    .addUserOption(o =>
      o.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser('user');

    await Warn.deleteMany({
      userId: user.id,
      guildId: interaction.guild.id
    });

    interaction.reply(`✅ Cleared warnings for ${user.tag}`);
  },

  async prefixExecute(message) {
    if (!checkUser(message.member, PermissionFlagsBits.Administrator))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention user.');

    await Warn.deleteMany({
      userId: user.id,
      guildId: message.guild.id
    });

    message.reply(`✅ Cleared warnings for ${user.tag}`);
  }
};