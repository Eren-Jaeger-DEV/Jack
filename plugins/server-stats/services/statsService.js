
const { ChannelType } = require('discord.js');
const ServerStats = require('../models/ServerStats');
const logger = require('../../../utils/logger');

const TYPE_ICONS = {
    'TOTAL': '📊 Total:',
    'ONLINE': '🟢 Online:',
    'IDLE': '🌙 Idle:',
    'DND': '🔴 DND:',
    'HUMANS': '👥 Humans:',
    'BOTS': '🤖 Bots:'
};

/**
 * Updates all registered stat channels in a guild.
 */
async function updateGuildStats(guild) {
    try {
        const stats = await ServerStats.find({ guildId: guild.id });
        if (stats.length === 0) return;

        // Fetch all members to get accurate counts (precence check requires fetching)
        const members = await guild.members.fetch({ withPresences: true });
        
        const counts = {
            'TOTAL': guild.memberCount,
            'HUMANS': members.filter(m => !m.user.bot).size,
            'BOTS': members.filter(m => m.user.bot).size,
            'ONLINE': members.filter(m => m.presence?.status === 'online').size,
            'IDLE': members.filter(m => m.presence?.status === 'idle').size,
            'DND': members.filter(m => m.presence?.status === 'dnd').size
        };

        for (const stat of stats) {
            const channel = guild.channels.cache.get(stat.channelId);
            if (!channel) {
                // Channel deleted, remove from DB
                await ServerStats.deleteOne({ _id: stat._id });
                continue;
            }

            const count = counts[stat.type] || 0;
            
            // Only update if value changed to respect rate limits
            if (stat.lastKnownValue === count && channel.name.includes(count.toString())) continue;

            const icon = TYPE_ICONS[stat.type] || '';
            const newName = `${icon} ${count}`;

            await channel.setName(newName).catch(err => {
                logger.error("ServerStats", `Failed to set name for channel ${channel.id}: ${err.message}`);
            });

            stat.lastKnownValue = count;
            stat.lastUpdated = new Date();
            await stat.save();
        }

    } catch (err) {
        logger.error("ServerStats", `Error updating stats for guild ${guild.id}: ${err.message}`);
    }
}

/**
 * Sets up a new stat channel.
 */
async function setupStatChannel(guild, type, format) {
    const existing = await ServerStats.findOne({ guildId: guild.id, type });
    if (existing) {
        const channel = guild.channels.cache.get(existing.channelId);
        if (channel) return { success: false, error: `${type} counter already exists: <#${channel.id}>` };
        await ServerStats.deleteOne({ _id: existing._id });
    }

    const icon = TYPE_ICONS[type] || '';
    const name = `${icon} ...`;

    const channel = await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: ['Connect'], // Usually stat channels are locked
            },
        ],
    });

    await ServerStats.create({
        guildId: guild.id,
        channelId: channel.id,
        type,
        nameFormat: format
    });

    return { success: true, channel };
}

module.exports = {
    updateGuildStats,
    setupStatChannel
};
