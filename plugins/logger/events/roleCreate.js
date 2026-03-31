const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role, client) {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ **Role Created**')
      .setColor('#2ecc71')
      .addFields(
        { name: 'Name', value: role.name, inline: true },
        { name: 'Color', value: `${role.hexColor}`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, role.guild, 'server', embed);
  }
};
