const { Events, EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../utils/logSender');
const { getAuditLogEntry, getChannelTypeName } = require('../utils/auditUtils');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    if (!channel.guild) return;

    const typeName = getChannelTypeName(channel.type);
    const embed = new EmbedBuilder()
      .setTitle(`${typeName} channel created`)
      .setColor('#2ecc71')
      .setTimestamp();

    const auditEntry = await getAuditLogEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    if (auditEntry) {
      embed.setAuthor({ name: auditEntry.executor.tag, iconURL: auditEntry.executor.displayAvatarURL() });
    }

    embed.addFields(
      { name: 'Name', value: channel.name, inline: true },
      { name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: true }
    );

    // Permission Overwrites (Carl-bot Style)
    if (channel.permissionOverwrites.cache.size > 0) {
      const voicePerms = [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.Speak
      ];

      channel.permissionOverwrites.cache.forEach(overwrite => {
        let permissionsString = '';
        voicePerms.forEach(permBit => {
            const permName = Object.keys(PermissionFlagsBits).find(key => PermissionFlagsBits[key] === permBit);
            const friendlyName = permName.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
            const hasPerm = overwrite.allow.has(permBit);
            permissionsString += `**${friendlyName}:** ${hasPerm ? '✅' : '❌'}\n`;
        });

        const typeLabel = overwrite.type === 0 ? 'Role' : 'Member';
        const target = channel.guild.roles.cache.get(overwrite.id) || channel.guild.members.cache.get(overwrite.id) || { name: overwrite.id };
        const targetName = target.name || target.user?.username || target.id || 'Unknown';

        embed.addFields({ name: `${typeLabel} override for ${targetName}`, value: permissionsString.trim(), inline: false });
      });
    }

    embed.setFooter({ text: `Channel ID: ${channel.id}` });

    await sendLog(client, channel.guild, 'server', embed);
  }
};
