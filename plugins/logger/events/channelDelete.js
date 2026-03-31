const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/logSender');
const { getAuditLogEntry, getChannelTypeName } = require('../utils/auditUtils');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    if (!channel.guild) return;

    const typeName = getChannelTypeName(channel.type);
    const embed = new EmbedBuilder()
      .setTitle(`${typeName} channel deleted`)
      .setColor('#e74c3c')
      .setTimestamp();

    const auditEntry = await getAuditLogEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    if (auditEntry) {
      embed.setAuthor({ name: auditEntry.executor.tag, iconURL: auditEntry.executor.displayAvatarURL() });
    }

    embed.addFields(
      { name: 'Name', value: channel.name, inline: true },
      { name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: true }
    );

    embed.setFooter({ text: `Channel ID: ${channel.id}` });

    await sendLog(client, channel.guild, 'server', embed);
  }
};
