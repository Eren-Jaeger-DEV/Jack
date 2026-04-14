
const statsService = require('./services/statsService');
const logger = require('../../utils/logger');

module.exports = {
    load(client) {
        // Startup sync
        setTimeout(() => {
            client.guilds.cache.forEach(guild => {
                statsService.updateGuildStats(guild).catch(() => {});
            });
        }, 15000);

        // Periodic sync (every 10 minutes to respect Discord rate limits)
        setInterval(() => {
            client.guilds.cache.forEach(guild => {
                statsService.updateGuildStats(guild).catch(() => {});
            });
        }, 10 * 60 * 1000);

        // Event-based sync (with a small delay to catch bulk joins/leaves)
        let syncTimeout = null;
        const triggerSync = (guild) => {
            if (syncTimeout) return;
            syncTimeout = setTimeout(() => {
                syncTimeout = null;
                statsService.updateGuildStats(guild).catch(() => {});
            }, 30000); // 30s debounce
        };

        client.on('guildMemberAdd', member => triggerSync(member.guild));
        client.on('guildMemberRemove', member => triggerSync(member.guild));
        client.on('presenceUpdate', (oldPresence, newPresence) => {
            // Presence updates are very frequent, we rely on the 10m interval for these
            // but we can trigger a sync if it's been a while.
            triggerSync(newPresence.guild);
        });

        logger.addLog("ServerStats", "Plugin loaded and monitoring network metrics.");
    }
};
