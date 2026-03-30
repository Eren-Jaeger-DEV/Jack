/**
 * Presence Manager Utility
 * Handles temporary presence updates based on command execution.
 */

/*
Activity Types in Discord.js v14:
0: PLAYING
1: STREAMING
2: LISTENING
3: WATCHING
5: COMPETING
*/

let presenceTimeout = null;

const commandMap = {
    // Clan system
    'clan': { text: 'Clan Empires rise', type: 3 },
    'profile': { text: 'Player dossiers', type: 3 },
    'battle': { text: 'in fierce Clan Battles', type: 5 },
    'editbp': { text: 'Clan Battle points', type: 3 },
    'ign': { text: 'BGMI databases', type: 3 },
    'uid': { text: 'BGMI databases', type: 3 },
    
    // Emoji & Stickers
    'emoji': { text: 'collecting rare Emojis', type: 0 },
    'sticker': { text: 'collecting Stickers', type: 0 },
    'pack': { text: 'managing Sticker Packs', type: 0 },
    
    // Moderation & Admin
    'mod': { text: 'the ban hammer fall', type: 3 },
    'kick': { text: 'the ban hammer fall', type: 3 },
    'ban': { text: 'the ban hammer fall', type: 3 },
    'mute': { text: 'the silence grow', type: 3 },
    'warn': { text: 'server rulebreakers', type: 3 },
    'clear': { text: 'messages disappear', type: 3 },
    'admin': { text: 'system protocols', type: 3 },
    'settings': { text: 'adjusting bot settings', type: 0 },
    
    // Fun & Social
    'fun': { text: 'having some fun', type: 0 },
    'action': { text: 'cool anime actions', type: 3 },
    'tictactoe': { text: 'a game of TicTacToe', type: 5 },
    'foster': { text: 'handling foster program', type: 3 },
    
    // Leveling
    'rank': { text: 'players level up', type: 3 },
    'addxp': { text: 'giving out XP', type: 0 },
    
    // Season Synergy
    'we': { text: 'Seasonal Synergy', type: 3 },
    'se': { text: 'Seasonal Synergy', type: 3 },
    
    // Utility
    'help': { text: 'navigating the guide', type: 3 },
    'info': { text: 'displaying bot info', type: 3 },
    'utility': { text: 'using utility tools', type: 0 }
};

/**
 * Sets a temporary presence for the bot.
 * @param {import("discord.js").Client} client - The Discord client.
 * @param {object} presenceData - The presence object.
 * @param {number} [duration=8000] - The duration in milliseconds.
 */
function setTemporaryPresence(client, presenceData, duration = 8000) {
    if (!client.user) return;

    if (presenceTimeout) {
        clearTimeout(presenceTimeout);
    }

    try {
        client.user.setActivity(presenceData.text, { type: presenceData.type });
    } catch (err) {}

    presenceTimeout = setTimeout(() => {
        try {
            client.user.setActivity("your server run smoothly 🚀", { type: 3 });
        } catch (err) {}
        presenceTimeout = null;
    }, duration);
}

/**
 * Gets the presence text for a specific command name.
 * @param {string} commandName - The name of the command.
 * @returns {object} The mapped presence object or fallback.
 */
function getPresenceText(commandName) {
    const defaultPresence = { text: "handling your commands ⚡", type: 0 }; // PLAYING
    if (!commandName) return defaultPresence;
    const name = commandName.toLowerCase();
    return commandMap[name] || defaultPresence;
}

module.exports = {
    setTemporaryPresence,
    getPresenceText
};
