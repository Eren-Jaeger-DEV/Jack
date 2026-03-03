const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Server information'),

  async execute(interaction) {
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
      .setTitle('🌍 Server Info')
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: 'Server Name', value: guild.name },
        { name: 'Members', value: `${guild.memberCount}` },
        { name: 'Created', value: `<t:${parseInt(guild.createdTimestamp/1000)}:R>` }
      )
      .setColor('Green');

    interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message) {
    const guild = message.guild;

    const embed = new EmbedBuilder()
      .setTitle('🌍 Server Info')
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: 'Server Name', value: guild.name },
        { name: 'Members', value: `${guild.memberCount}` },
        { name: 'Created', value: `<t:${parseInt(guild.createdTimestamp/1000)}:R>` }
      )
      .setColor('Green');

    message.channel.send({ embeds: [embed] });
  }
};