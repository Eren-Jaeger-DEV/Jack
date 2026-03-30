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
    { text: "over the thriving community 🌟", type: 3 }, // WATCHING
    { text: "for misbehaving members 👁️", type: 3 },
    { text: "with the server economy 💰", type: 0 },     // PLAYING
    { text: "epic Clan Battles ⚔️", type: 5 },          // COMPETING
    { text: "Season Synergy scores 📊", type: 3 },
    { text: "user commands ⚡", type: 2 },              // LISTENING
    { text: "the marketplace pulse 📉", type: 3 }
];

const commandMap = {
    // Moderation
    'kick': { text: 'the ban hammer strike 🔨', type: 3 },
    'ban': { text: 'the ban hammer strike 🔨', type: 3 },
    'unban': { text: 'forgiveness protocols 🕊️', type: 0 },
    'mute': { text: 'the silence spread 🔇', type: 3 },
    'unmute': { text: 'voices return 🔊', type: 2 },
    'warn': { text: 'rulebreakers carefully 👁️', type: 3 },
    'unwarn': { text: 'clearing records 📝', type: 0 },
    'clear': { text: 'messages vanish 🧹', type: 3 },
    'clearall': { text: 'obliterating history 💥', type: 0 },
    'clearwarns': { text: 'wiping the slate clean 🧼', type: 0 },
    'lock': { text: 'securing the perimeter 🔒', type: 3 },
    'unlock': { text: 'opening the gates 🔓', type: 0 },
    'addrole': { text: 'granting power ⚡', type: 0 },
    'removerole': { text: 'revoking power 📉', type: 0 },
    'nickname': { text: 'rewriting identities 🏷️', type: 0 },
    'mod': { text: 'overall server safety 🛡️', type: 3 },

    // Role Management
    'rradd': { text: 'configuring React Roles 🎭', type: 0 },
    'rrremove': { text: 'configuring React Roles 🎭', type: 0 },
    'rrcreate': { text: 'building React Roles 🛠️', type: 0 },
    'rrdelete': { text: 'destroying React Roles 💥', type: 0 },

    // Clan & Battles
    'clan': { text: 'empires rise and fall 🏛️', type: 3 },
    'profile': { text: 'checking player dossiers 📁', type: 3 },
    'uid': { text: 'searching the BGMI database 🔍', type: 3 },
    'ign': { text: 'searching the BGMI database 🔍', type: 3 },
    'deleteplayer': { text: 'erasing clan records ❌', type: 0 },
    'battle': { text: 'in fierce Clan Battles ⚔️', type: 5 },
    'editbp': { text: 'manipulating Battle Points 💰', type: 0 },
    'edittotalbp': { text: 'recalculating rankings 📈', type: 0 },

    // Leveling & Economy
    'rank': { text: 'players level up ✨', type: 3 },
    'addxp': { text: 'distributing experience 🎁', type: 0 },
    'removexp': { text: 'draining experience 🧛', type: 0 },
    'setlevel': { text: 'altering the power scale ⚖️', type: 0 },
    'resetxp': { text: 'resetting power levels 💀', type: 0 },
    'setxp': { text: 'altering the power scale ⚖️', type: 0 },
    'popmarket': { text: 'the marketplace pulse 📉', type: 3 },
    'sellpop': { text: 'a bustling market deal 💰', type: 3 },

    // Season Synergy
    'we': { text: 'Weekend Synergy scores 🌟', type: 3 },
    'se': { text: 'Seasonal Synergy rankings 🏆', type: 3 },

    // Media
    'emoji': { text: 'with rare Emojis 🎭', type: 0 },
    'emojibank': { text: 'organizing the Emoji Vault 🏦', type: 0 },
    'sticker': { text: 'collecting legendary Stickers 🖼️', type: 0 },
    'pack': { text: 'managing specialized Sticker Packs 📦', type: 0 },
    'avatar': { text: 'admiring user avatars 📸', type: 3 },

    // Games & Events
    'tictactoe': { text: 'a deadly game of TicTacToe ⭕', type: 5 },
    'action': { text: 'cool anime action sequences 🍿', type: 3 },
    'foster': { text: 'the foster program applications 👶', type: 3 },
    'poll': { text: 'democracy in action 🗳️', type: 3 },
    'steal': { text: 'stealing memes 🥷', type: 0 },

    // Core Utilities
    'ping': { text: 'network latency metrics 🏓', type: 3 },
    'help': { text: 'lost travelers find their way 🗺️', type: 3 },
    'serverinfo': { text: 'deep server analytics 📊', type: 3 },
    'userinfo': { text: 'running background checks 🕵️', type: 0 },
    'afk': { text: 'sleepy members 💤', type: 3 },
    'sayit': { text: 'echoing voices 🗣️', type: 2 },
    'announce': { text: 'loud broadcasting system 📢', type: 2 },
    'admin': { text: 'classified system protocols 🛡️', type: 3 },
    'settings': { text: 'adjusting bot settings ⚙️', type: 0 }
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
