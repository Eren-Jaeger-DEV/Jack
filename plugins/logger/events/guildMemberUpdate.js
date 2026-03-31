const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
      .setColor('#34495e')
      .setTimestamp();

    let changed = false;

    // 1. Nickname Change
    if (oldMember.nickname !== newMember.nickname) {
      embed.setTitle('👤 **Nickname Changed**')
        .addFields(
          { name: 'Before', value: oldMember.nickname || 'None', inline: true },
          { name: 'After', value: newMember.nickname || 'None', inline: true }
        );
      changed = true;
    }

    // 2. Role Change
    const oldRoles = oldMember.roles.cache.map(r => r.id);
    const newRoles = newMember.roles.cache.map(r => r.id);

    const added = newRoles.filter(r => !oldRoles.includes(r));
    const removed = oldRoles.filter(r => !newRoles.includes(r));

    if (added.length > 0) {
      embed.setTitle('🛡️ **Role Added**')
        .addFields({ name: 'Added Role(s)', value: added.map(r => `<@&${r}>`).join(', ') });
      changed = true;
    }

    if (removed.length > 0) {
      embed.setTitle('🛡️ **Role Removed**')
        .addFields({ name: 'Removed Role(s)', value: removed.map(r => `<@&${r}>`).join(', ') });
      changed = true;
    }

    if (changed) await sendLog(client, newMember.guild, 'member', embed);
  }
};
