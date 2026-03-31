const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/logSender');
const { getAuditLogEntry } = require('../utils/auditUtils');

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages, channel, client) {
    const guild = channel.guild;
    if (!guild) return;

    const count = messages.size;
    const embed = new EmbedBuilder()
      .setTitle(`${count} Messages purged in #${channel.name}`)
      .setColor('#ff4757')
      .setTimestamp();

    // Fetch Audit Log for the moderator
    const auditEntry = await getAuditLogEntry(guild, AuditLogEvent.MessageBulkDelete, channel.id);
    if (auditEntry) {
      embed.setAuthor({ name: auditEntry.executor.tag, iconURL: auditEntry.executor.displayAvatarURL() });
    }

    // List recent messages (reversed to show latest first)
    const sortedMessages = Array.from(messages.values()).reverse().slice(0, 5);
    const messageContent = sortedMessages.map(m => `[${m.author?.username || 'Unknown'}]: ${m.content ? (m.content.length > 50 ? m.content.substring(0, 47) + '...' : m.content) : '[No Content/Attachment]'}`).join('\n');

    if (messageContent) {
      embed.setDescription(messageContent);
    }

    embed.setFooter({ text: `${Math.min(count, 5)} latest shown` });

    await sendLog(client, guild, 'message', embed);
  }
};
