const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (message.partial || !message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .setTitle('🗑️ **Message Deleted**')
      .setColor('#ff4747')
      .addFields(
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        { name: 'Sent By', value: `<@${message.author.id}>`, inline: true },
        { name: 'Content', value: message.content || '[No Content/Attachment Only]' }
      )
      .setTimestamp();

    await sendLog(client, message.guild, 'message', embed);
  }
};
