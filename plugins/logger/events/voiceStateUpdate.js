const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const { member, guild } = newState;
    if (!member || member.user.bot) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTimestamp();

    // 1. JOINED
    if (!oldState.channelId && newState.channelId) {
      embed.setColor('#00ff00')
        .setDescription(`🟢 **Joined Voice Channel**\nJoined: <#${newState.channelId}>`);
      return sendLog(client, guild, 'voice', embed);
    }

    // 2. LEFT
    if (oldState.channelId && !newState.channelId) {
      embed.setColor('#ff0000')
        .setDescription(`🔴 **Left Voice Channel**\nLeft: <#${oldState.channelId}>`);
      return sendLog(client, guild, 'voice', embed);
    }

    // 3. MOVED
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      embed.setColor('#ffff00')
        .setDescription(`🟡 **Moved Voice Channel**\nFrom: <#${oldState.channelId}>\nTo: <#${newState.channelId}>`);
      return sendLog(client, guild, 'voice', embed);
    }
  }
};
