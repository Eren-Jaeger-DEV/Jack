/**
 * Presence Manager Utility
 * Handles temporary presence updates and background rotations.
 */

/*
Activity Types in Discord.js v14:
0: PLAYING
1: STREAMING
2: LISTENING
3: WATCHING
5: COMPETING
*/

let currentPresenceTimeout = null;
let defaultPresenceInterval = null;

const defaultActivities = [
    { text: "Strategic Infrastructure", type: 3 }, // WATCHING
    { text: "Analyzing Synergy Metrics", type: 3 },
    { text: "Optimizing Program Data", type: 0 },   // PLAYING
    { text: "Active Clan Engagements", type: 5 },   // COMPETING
    { text: "System Node Stability", type: 3 },
    { text: "Secure Command Stream", type: 2 },     // LISTENING
    { text: "Market Pulse & Metrics", type: 3 }
];

const commandMap = {
    // Operations & Security
    'kick': { text: 'Enforcing Security Protocol', type: 3 },
    'ban': { text: 'Enforcing Security Protocol', type: 3 },
    'unban': { text: 'Restoring Access Rights', type: 0 },
    'mute': { text: 'Deploying Communication Silence', type: 3 },
    'unmute': { text: 'Restoring Voice Channels', type: 2 },
    'warn': { text: 'Documenting Rule Violations', type: 3 },
    'unwarn': { text: 'Clearing Incident Records', type: 0 },
    'lock': { text: 'Securing Perimeter Channels', type: 3 },
    'unlock': { text: 'Restoring Public Access', type: 0 },
    'clear': { text: 'Purging Command History', type: 3 },
    'clearall': { text: 'Sanitizing Channel Data', type: 3 },
    'mod': { text: 'Global System Safety', type: 3 },
    'admin': { text: 'Classified System Protocols', type: 3 },
    'enable': { text: 'Activating System Modules', type: 0 },
    'disable': { text: 'Deactivating System Modules', type: 0 },

    // Infrastructure & Management
    'clan': { text: 'Analyzing Clan Architecture', type: 3 },
    'register': { text: 'Processing New Registrations', type: 0 },
    'profile': { text: 'Reviewing Player Dossiers', type: 3 },
    'uid': { text: 'Querying Network Database', type: 3 },
    'ign': { text: 'Querying Network Database', type: 3 },
    'battle': { text: 'Active Engagements', type: 5 },
    'editbp': { text: 'Adjusting Strategic Metrics', type: 0 },
    'edittotalbp': { text: 'Recalculating Rankings', type: 3 },
    'rank': { text: 'Processing Performance Data', type: 3 },
    'leaderboard': { text: 'Retrieving Competitive Data', type: 3 },
    'rradd': { text: 'Configuring Role Gateways', type: 0 },
    'rrcreate': { text: 'Defining Role Gateways', type: 0 },

    // Asset Procurement & Economy
    'popmarket': { text: 'Monitoring Market Pulse', type: 3 },
    'sellpop': { text: 'Processing Market Transaction', type: 0 },
    'cancelpop': { text: 'Terminating Market Listing', type: 0 },
    'sync': { text: 'Synchronizing Central Database', type: 0 },
    'emojiadd': { text: 'Ingesting Visual Assets', type: 0 },
    'emojibank': { text: 'Accessing Asset Vault', type: 3 },
    'stickeradd': { text: 'Ingesting Media Assets', type: 0 },
    'packadd': { text: 'Compiling Asset Packages', type: 0 },

    // Tactical Coordination
    'fs-start': { text: 'Initializing Foster Program', type: 3 },
    'foster': { text: 'Managing Neophyte Allocations', type: 3 },
    'createteam': { text: 'Assembling Tactical Squad', type: 0 },
    'teamup': { text: 'Reviewing Squad Formations', type: 3 },
    'hud': { text: 'Calibrating Tactical HUD', type: 3 },
    'poll': { text: 'Processing Internal Consensus', type: 3 },

    // Metrics & Analytics
    'we': { text: 'Analyzing Synergy Data', type: 3 },
    'se': { text: 'Processing Seasonal Rankings', type: 3 },
    'synergy-setup': { text: 'Calibrating Synergy Node', type: 0 },
    'regstatus': { text: 'Auditing Registration Flow', type: 3 },
    'serverinfo': { text: 'Running System Analytics', type: 3 },
    'userinfo': { text: 'Background Check: Active User', type: 0 },
    'ping': { text: 'Measuring Network Latency', type: 3 },
    'settings': { text: 'Calibrating System Nodes', type: 0 },
    'help': { text: 'Retrieving Operations Manual', type: 0 }
};

/**
 * Jumpstarts the automatic idle rotation of the bot's presence.
 */
function startDefaultPresenceRotation(client) {
    if (defaultPresenceInterval) clearInterval(defaultPresenceInterval);
    
    const rotate = () => {
        if (currentPresenceTimeout) return; // Yield to a temporary command presence
        const presence = defaultActivities[Math.floor(Math.random() * defaultActivities.length)];
        try {
            client.user?.setActivity(presence.text, { type: presence.type });
        } catch (err) {}
    };

    rotate(); // Mount immediately
    defaultPresenceInterval = setInterval(rotate, 60000); // Shift every 60 seconds
}

/**
 * Sets a temporary presence for the bot dynamically on action.
 */
function setTemporaryPresence(client, presenceData, duration = 8000) {
    if (!client.user) return;

    if (currentPresenceTimeout) {
        clearTimeout(currentPresenceTimeout);
    }

    try {
        client.user.setActivity(presenceData.text, { type: presenceData.type });
    } catch (err) {}

    currentPresenceTimeout = setTimeout(() => {
        currentPresenceTimeout = null;
        // Upon timeout, snap back to a random default idle activity immediately
        const presence = defaultActivities[Math.floor(Math.random() * defaultActivities.length)];
        try {
            client.user.setActivity(presence.text, { type: presence.type });
        } catch (err) {}
    }, duration);
}

/**
 * Identifies the aesthetic activity for a specific action.
 */
function getPresenceText(commandName) {
    const defaultCommandPresence = { text: "handling your commands ⚡", type: 0 };
    if (!commandName) return defaultCommandPresence;
    const name = commandName.toLowerCase();
    return commandMap[name] || defaultCommandPresence;
}

module.exports = {
    startDefaultPresenceRotation,
    setTemporaryPresence,
    getPresenceText
};
