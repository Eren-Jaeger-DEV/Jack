const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (oldMessage.partial || !oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
      .setTitle('📝 **Message Edited**')
      .setColor('#3498db')
      .addFields(
        { name: 'Before', value: oldMessage.content || '[No Content]' },
        { name: 'After', value: newMessage.content || '[No Content]' },
        { name: 'Channel', value: `<#${oldMessage.channelId}>`, inline: true },
        { name: 'Sent By', value: `<@${oldMessage.author.id}>`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, oldMessage.guild, 'message', embed);
  }
};
