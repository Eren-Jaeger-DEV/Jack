const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages, channel, client) {
    const guild = channel.guild;
    if (!guild) return;

    const embed = new EmbedBuilder()
      .setTitle('🧹 **Bulk Deletion**')
      .setColor('#9b59b6')
      .setDescription(`Cleared **${messages.size}** messages in <#${channel.id}>.`)
      .setTimestamp();

    await sendLog(client, guild, 'message', embed);
  }
};
