const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show user avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 512 }))
      .setColor('Purple');

    interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message) {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 512 }))
      .setColor('Purple');

    message.channel.send({ embeds: [embed] });
  }
};