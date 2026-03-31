const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/logSender');
const { getAuditLogEntry, getChannelTypeName } = require('../utils/auditUtils');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;

    const typeName = getChannelTypeName(newChannel.type);
    const embed = new EmbedBuilder()
      .setTitle(`${typeName} channel updated`)
      .setColor('#3498db')
      .setTimestamp()
      .setFooter({ text: `Channel ID: ${newChannel.id}` });

    const auditEntry = await getAuditLogEntry(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    if (auditEntry) {
      embed.setAuthor({ name: auditEntry.executor.tag, iconURL: auditEntry.executor.displayAvatarURL() });
    }

    let changed = false;

    // 1. Name Change
    if (oldChannel.name !== newChannel.name) {
      embed.addFields(
        { name: 'Old Name', value: oldChannel.name, inline: true },
        { name: 'New Name', value: newChannel.name, inline: true }
      );
      changed = true;
    }

    // 2. Topic Change (Text Channels)
    if (oldChannel.topic !== newChannel.topic) {
      embed.addFields(
        { name: 'Old Topic', value: oldChannel.topic || 'None', inline: false },
        { name: 'New Topic', value: newChannel.topic || 'None', inline: false }
      );
      changed = true;
    }

    // 3. Category Change
    if (oldChannel.parentId !== newChannel.parentId) {
      const oldParent = oldChannel.parent ? oldChannel.parent.name : 'None';
      const newParent = newChannel.parent ? newChannel.parent.name : 'None';
      embed.addFields(
        { name: 'Old Category', value: oldParent, inline: true },
        { name: 'New Category', value: newParent, inline: true }
      );
      changed = true;
    }

    if (changed) {
        embed.setDescription(`Channel: ${newChannel}`);
        await sendLog(client, newChannel.guild, 'server', embed);
    }
  }
};
