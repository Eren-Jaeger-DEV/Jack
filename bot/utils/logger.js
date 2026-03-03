const GuildConfig = require('../database/models/GuildConfig');

module.exports = async (guild, embed) => {
  try {
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config?.logChannelId) return;

    // Fetch channel instead of cache
    const channel = await guild.channels.fetch(config.logChannelId);
    if (!channel) return;

    await channel.send({ embeds: [embed] });

  } catch (err) {
    console.error("Logger error:", err);
  }
};