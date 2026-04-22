const configManager = require('../../../bot/utils/configManager');

/**
 * LOGGER PLUGIN UTILITY
 * Dispatches logs to specialized channels mapped via the Neural Bridge dashboard.
 */
async function sendLog(client, guild, type, embed) {
    if (!guild) return;

    try {
        const config = await configManager.getGuildConfig(guild.id);
        const settings = config?.settings || {};

        // 1. Prioritize Dashboard-Mapped IDs
        const settingMap = {
            'voice': settings.voiceLogChannelId,
            'message': settings.messageLogChannelId,
            'join-leave': settings.joinLeaveLogChannelId,
            'member': settings.memberLogChannelId,
            'server': settings.serverLogChannelId,
            'tickets': settings.ticketsLogChannelId,
            'pop': settings.popLogChannelId,
            'invite': settings.inviteLogChannelId || settings.logChannelId
        };

        let channelId = settingMap[type] || settings.logChannelId;
        let channel = null;

        if (channelId) {
            channel = guild.channels.cache.get(channelId);
        }

        // 2. Fallback to ServerMap (Name-based) if dashboard mapping is missing
        if (!channel && client.serverMap) {
            const serverMapNameMap = {
                'voice': 'voice_log',
                'message': 'message_log',
                'join-leave': 'join_leave_log',
                'member': 'member_log',
                'server': 'server_log'
            };
            channel = client.serverMap.getChannel('LOGS', serverMapNameMap[type]);
        }

        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error(`[LoggerPlugin] Failed to send ${type} log:`, err.message);
    }
}

module.exports = { sendLog };
