const { EmbedBuilder } = require('discord.js');
const guildLogger = require('../utils/guildLogger');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageDelete',

  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    try {

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Message Deleted')
        .addFields(
          { name: 'User', value: `${message.author.tag} (${message.author.id})` },
          { name: 'Channel', value: `${message.channel}` },
          { name: 'Content', value: message.content || 'No text content' }
        )
        .setColor('Red')
        .setTimestamp();

      await guildLogger.logToGuild(message.guild, embed);

    } catch (err) {
      logger.error("MessageDelete", `Unhandled error: ${err.message}`);
    }
  }
};