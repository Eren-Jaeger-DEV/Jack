const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageDelete',

  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message Deleted')
      .addFields(
        { name: 'User', value: `${message.author.tag}` },
        { name: 'Channel', value: `${message.channel}` },
        { name: 'Content', value: message.content || 'No text content' }
      )
      .setColor('Red')
      .setTimestamp();

    await logger(message.guild, embed);
  }
};