const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get info about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
      .setTitle('👤 User Info')
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Username', value: user.tag },
        { name: 'ID', value: user.id },
        { name: 'Joined Server', value: `<t:${parseInt(member.joinedTimestamp/1000)}:R>` },
        { name: 'Account Created', value: `<t:${parseInt(user.createdTimestamp/1000)}:R>` }
      )
      .setColor('Blue');

    interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message) {
    const user = message.mentions.users.first() || message.author;
    const member = await message.guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
      .setTitle('👤 User Info')
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Username', value: user.tag },
        { name: 'ID', value: user.id },
        { name: 'Joined Server', value: `<t:${parseInt(member.joinedTimestamp/1000)}:R>` },
        { name: 'Account Created', value: `<t:${parseInt(user.createdTimestamp/1000)}:R>` }
      )
      .setColor('Blue');

    message.channel.send({ embeds: [embed] });
  }
};