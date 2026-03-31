const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    if (!channel.guild) return;

    const embed = new EmbedBuilder()
      .setTitle('📁 **Channel Deleted**')
      .setColor('#e74c3c')
      .addFields(
        { name: 'Name', value: channel.name, inline: true },
        { name: 'Type', value: `${channel.type}`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, channel.guild, 'server', embed);
  }
};
