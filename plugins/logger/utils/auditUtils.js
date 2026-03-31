const { AuditLogEvent } = require('discord.js');

/**
 * Fetches the audit log entry for a specific action and target.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').AuditLogEvent} action 
 * @param {string} targetId 
 * @returns {Promise<import('discord.js').GuildAuditLogsEntry|null>}
 */
async function getAuditLogEntry(guild, action, targetId) {
    try {
        const auditLogs = await guild.fetchAuditLogs({
            limit: 5,
            type: action
        });

        const entry = auditLogs.entries.find(e => e.targetId === targetId);
        return entry || null;
    } catch (error) {
        console.error(`[AuditUtils] Error fetching audit logs: ${error.message}`);
        return null;
    }
}

/**
 * Formats a permission overwrite bitfield into Carl-bot style checkmarks.
 * @param {import('discord.js').PermissionsBitField} permissions 
 * @param {string[]} requestedPermissions 
 * @returns {string}
 */
function formatPermissions(permissions, requestedPermissions) {
    const lines = requestedPermissions.map(perm => {
        const hasPerm = permissions.has(perm);
        return `**${perm.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}:** ${hasPerm ? '✅' : '❌'}`;
    });
    return lines.join('\n');
}

/**
 * Returns a human-readable name for a channel type.
 * @param {number} type 
 * @returns {string}
 */
function getChannelTypeName(type) {
    const types = {
        0: 'Text',
        2: 'Voice',
        4: 'Category',
        5: 'Announcement',
        13: 'Stage',
        15: 'Forum'
    };
    return types[type] || `Unknown (${type})`;
}

module.exports = {
    getAuditLogEntry,
    formatPermissions,
    getChannelTypeName
};
