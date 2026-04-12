const { inviteCache } = require('./state');
const { addLog } = require('../../utils/logger');

/**
 * Fetch and cache all invites for a guild
 */
async function cacheGuildInvites(guild) {
    try {
        if (!guild.members.me.permissions.has("ManageGuild")) return;
        const invites = await guild.invites.fetch();
        const guildInvites = new Map();
        invites.forEach(inv => guildInvites.set(inv.code, inv.uses));
        inviteCache.set(guild.id, guildInvites);
    } catch (e) {
        addLog("InviteTracker", `Failed to fetch invites for guild ${guild.id}: ${e.message}`);
    }
}

module.exports = {
  load: async (client) => {
    addLog("InviteTracker", "Initializing invite cache...");
    for (const guild of client.guilds.cache.values()) {
        await cacheGuildInvites(guild);
    }
    addLog("InviteTracker", "Cache initialized.");
  }
};
