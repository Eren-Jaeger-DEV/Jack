const { EmbedBuilder } = require('discord.js');

/**
 * LOGGER PLUGIN UTILITY
 * Dispatches logs to the specialized channels within the LOGS category.
 */

async function sendLog(client, guild, type, embed) {
    if (!client.serverMap || !guild) return;

    const channelMap = {
        'voice': 'voice_log',
        'message': 'message_log',
        'join-leave': 'join_leave_log',
        'member': 'member_log',
        'server': 'server_log'
    };

    const targetName = channelMap[type];
    if (!targetName) return;

    const channel = client.serverMap.getChannel('LOGS', targetName);
    if (!channel) return;

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error(`[LoggerPlugin] Failed to send ${type} log:`, err.message);
    }
}

module.exports = { sendLog };
