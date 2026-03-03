const Warn = require('../../database/models/Warn');
const { checkUser } = require('../../utils/checkPermission');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings')
    .addUserOption(o =>
      o.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');

    const warns = await Warn.find({
      userId: user.id,
      guildId: interaction.guild.id
    });

    if (!warns.length)
      return interaction.reply(`${user.tag} has no warnings.`);

    const list = warns.map((w, i) => `${i+1}. ${w.reason}`).join('\n');

    interaction.reply(`⚠️ Warnings for ${user.tag}:\n${list}`);
  },

  async prefixExecute(message) {
    if (!checkUser(message.member, PermissionFlagsBits.ModerateMembers))
      return message.reply('❌ No permission.');

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention user.');

    const warns = await Warn.find({
      userId: user.id,
      guildId: message.guild.id
    });

    if (!warns.length)
      return message.reply(`${user.tag} has no warnings.`);

    const list = warns.map((w,i)=>`${i+1}. ${w.reason}`).join('\n');

    message.reply(`⚠️ Warnings for ${user.tag}:\n${list}`);
  }
};