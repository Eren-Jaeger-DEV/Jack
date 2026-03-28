const GuildConfig = require('../database/models/GuildConfig');
const logger = require('./logger');

/**
 * JACK GUILD LOGGER (v1.0.0)
 * Handles sending administrative logs and embeds to Discord channels.
 */

async function logToGuild(guild, payload, type = 'log') {
    if (!guild || !payload) return;

    try {
        const config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config) return;

        let channelId;
        switch (type) {
            case 'mod':
                channelId = config.settings?.modLogChannelId;
                break;
            case 'invite':
                channelId = config.settings?.inviteLogChannelId;
                break;
            case 'market':
                channelId = config.settings?.marketLogChannelId;
                break;
            default:
                channelId = config.settings?.logChannelId;
        }

        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        if (typeof payload === 'string') {
            await channel.send({ content: payload });
        } else {
            // Assume embed or message options
            await channel.send(payload.embeds ? payload : { embeds: [payload] });
        }

    } catch (err) {
        logger.error("GuildLogger", `Failed to log to guild ${guild.id}: ${err.message}`);
    }
}

module.exports = {
    logToGuild,
    // Aliases for retro-compatibility if needed
    send: logToGuild
};
