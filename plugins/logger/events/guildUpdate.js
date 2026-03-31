const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildUpdate,
  async execute(oldGuild, newGuild, client) {
    const embed = new EmbedBuilder()
      .setTitle('🏛️ **Server Updated**')
      .setColor('#f1c40f')
      .setTimestamp();

    let changed = false;

    // 1. Name Change
    if (oldGuild.name !== newGuild.name) {
      embed.addFields(
        { name: 'Old Name', value: oldGuild.name, inline: true },
        { name: 'New Name', value: newGuild.name, inline: true }
      );
      changed = true;
    }

    // 2. Icon Change
    if (oldGuild.iconURL() !== newGuild.iconURL()) {
      embed.setDescription('Icon updated.')
        .setThumbnail(newGuild.iconURL());
      changed = true;
    }

    if (changed) await sendLog(client, newGuild, 'server', embed);
  }
};
