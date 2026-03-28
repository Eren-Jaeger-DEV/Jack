const { getGuildConfig } = require('./configManager');

module.exports = (guild, embed) => {
  if (!guild) return;

  // Fire-and-forget: do not await this to prevent blocking command execution
  getGuildConfig(guild.id).then(async (config) => {
    try {
      const logChannelId = config?.settings?.logChannelId;
      if (!logChannelId) return;

      // Try cache first, then fetch if needed (but still non-blocking for the caller)
      let channel = guild.channels.cache.get(logChannelId);
      if (!channel) {
        channel = await guild.channels.fetch(logChannelId).catch(() => null);
      }
      
      if (!channel) return;

      await channel.send({ embeds: [embed] }).catch(() => null);
    } catch (err) {
      console.error("[Logger] Background Error:", err);
    }
  }).catch(err => {
    console.error("[Logger] Config Fetch Error:", err);
  });
};