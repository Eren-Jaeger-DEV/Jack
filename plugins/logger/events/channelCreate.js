const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    if (!channel.guild) return;

    const embed = new EmbedBuilder()
      .setTitle('📁 **Channel Created**')
      .setColor('#2ecc71')
      .addFields(
        { name: 'Name', value: channel.name, inline: true },
        { name: 'Type', value: `${channel.type}`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, channel.guild, 'server', embed);
  }
};
