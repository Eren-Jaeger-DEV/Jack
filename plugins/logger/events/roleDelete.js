const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role, client) {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ **Role Deleted**')
      .setColor('#e74c3c')
      .addFields(
        { name: 'Name', value: role.name, inline: true },
        { name: 'Color', value: `${role.hexColor}`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, role.guild, 'server', embed);
  }
};
