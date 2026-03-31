const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;

    const embed = new EmbedBuilder()
      .setTitle('📁 **Channel Updated**')
      .setColor('#3498db')
      .setTimestamp();

    let changed = false;

    // 1. Name Change
    if (oldChannel.name !== newChannel.name) {
      embed.addFields(
        { name: 'Old Name', value: oldChannel.name, inline: true },
        { name: 'New Name', value: newChannel.name, inline: true }
      );
      changed = true;
    }

    // 2. Topic Change
    if (oldChannel.topic !== newChannel.topic) {
      embed.addFields(
        { name: 'Old Topic', value: oldChannel.topic || 'None', inline: false },
        { name: 'New Topic', value: newChannel.topic || 'None', inline: false }
      );
      changed = true;
    }

    if (changed) {
        embed.setDescription(`Channel: <#${newChannel.id}>`);
        await sendLog(client, newChannel.guild, 'server', embed);
    }
  }
};
