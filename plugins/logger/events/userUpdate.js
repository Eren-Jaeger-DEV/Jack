const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.UserUpdate,
  async execute(oldUser, newUser, client) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: newUser.tag, iconURL: newUser.displayAvatarURL() })
      .setColor('#95a5a6')
      .setTimestamp();

    let changed = false;

    // 1. Avatar Change
    if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
      embed.setTitle('🖼️ **Avatar Changed**')
        .setThumbnail(newUser.displayAvatarURL())
        .setDescription(`New avatar updated.`);
      changed = true;
    }

    // 2. Username Change
    if (oldUser.username !== newUser.username) {
      embed.setTitle('👤 **Username Changed**')
        .addFields(
          { name: 'Old Username', value: oldUser.username, inline: true },
          { name: 'New Username', value: newUser.username, inline: true }
        );
      changed = true;
    }

    if (changed) {
      // UserUpdate handles global changes, so we log to each guild the user is in that has our logger enabled.
      client.guilds.cache.forEach(guild => {
        if (guild.members.cache.has(newUser.id)) {
          sendLog(client, guild, 'member', embed);
        }
      });
    }
  }
};
