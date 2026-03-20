/**
 * Presence Manager Utility
 * Handles temporary presence updates based on command execution.
 */

let presenceTimeout = null;

const commandMap = {
    // Clan system
    'clan': 'processing clan system',
    'profile': 'viewing clan profile',
    'battle': 'managing clan battles',
    
    // Emoji & Stickers
    'emoji': 'organizing emojis',
    'sticker': 'collecting stickers',
    'pack': 'managing sticker packs',
    
    // Moderation & Admin
    'mod': 'moderating the server',
    'admin': 'performing admin tasks',
    'settings': 'adjusting bot settings',
    
    // Fun & Social
    'fun': 'having some fun',
    'rank': 'tracking user levels',
    'foster': 'handling foster program',
    
    // Utility
    'help': 'showing help menu',
    'info': 'displaying bot info',
    'utility': 'using utility tools'
};

/**
 * Sets a temporary presence for the bot.
 * @param {import("discord.js").Client} client - The Discord client.
 * @param {string} text - The text to display.
 * @param {number} [duration=8000] - The duration in milliseconds.
 */
function setTemporaryPresence(client, text, duration = 8000) {
    if (!client.user) return;

    // Clear any existing timeout to prevent flickering or early resets
    if (presenceTimeout) {
        clearTimeout(presenceTimeout);
    }

    try {
        // type 3: Watching
        client.user.setActivity(text, { type: 3 });
    } catch (err) {
        // Silent fail to avoid console spam
    }

    presenceTimeout = setTimeout(() => {
        try {
            client.user.setActivity("your server run smoothly", { type: 3 });
        } catch (err) {
            // Silent fail
        }
        presenceTimeout = null;
    }, duration);
}

/**
 * Gets the presence text for a specific command name.
 * @param {string} commandName - The name of the command.
 * @returns {string} The mapped presence text or fallback.
 */
function getPresenceText(commandName) {
    if (!commandName) return "handling commands";
    const name = commandName.toLowerCase();
    return commandMap[name] || "handling commands";
}

module.exports = {
    setTemporaryPresence,
    getPresenceText
};
