const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(oldRole, newRole, client) {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ **Role Updated**')
      .setColor('#3498db')
      .setTimestamp();

    let changed = false;

    // 1. Name Change
    if (oldRole.name !== newRole.name) {
      embed.addFields(
        { name: 'Old Name', value: oldRole.name, inline: true },
        { name: 'New Name', value: newRole.name, inline: true }
      );
      changed = true;
    }

    // 2. Color Change
    if (oldRole.hexColor !== newRole.hexColor) {
      embed.addFields(
        { name: 'Old Color', value: oldRole.hexColor, inline: true },
        { name: 'New Color', value: newRole.hexColor, inline: true }
      );
      changed = true;
    }

    if (changed) {
        embed.setDescription(`Role: <@&${newRole.id}>`);
        await sendLog(client, newRole.guild, 'server', embed);
    }
  }
};
