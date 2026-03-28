/**
 * JACK COOLDOWN MANAGER (v2.1.0)
 * Memory-efficient per-user and per-guild rate limiting implementation.
 */

const cooldowns = new Map(); // CommandName -> Map(ID -> Timestamp)

/**
 * Checks if a user or guild is on cooldown for a specific command.
 */
function checkCooldown(commandName, userId, guildId, cooldownOptions) {
    if (!cooldownOptions) return { onCooldown: false };

    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Map());
    }

    const timestamps = cooldowns.get(commandName);
    const now = Date.now();

    // 1. User Cooldown
    if (cooldownOptions.user && userId) {
        const userExpiration = timestamps.get(`u_${userId}`) || 0;
        if (now < userExpiration) {
            return { 
                onCooldown: true, 
                timeLeft: Math.ceil((userExpiration - now) / 1000),
                type: 'user'
            };
        }
    }

    // 2. Guild Cooldown
    if (cooldownOptions.guild && guildId) {
        const guildExpiration = timestamps.get(`g_${guildId}`) || 0;
        if (now < guildExpiration) {
            return { 
                onCooldown: true, 
                timeLeft: Math.ceil((guildExpiration - now) / 1000),
                type: 'guild'
            };
        }
    }

    return { onCooldown: false };
}

/**
 * Applies a cooldown to a user and/or guild for a command.
 */
function applyCooldown(commandName, userId, guildId, cooldownOptions) {
    if (!cooldownOptions) return;

    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Map());
    }

    const timestamps = cooldowns.get(commandName);
    const now = Date.now();

    if (cooldownOptions.user && userId) {
        timestamps.set(`u_${userId}`, now + cooldownOptions.user);
    }

    if (cooldownOptions.guild && guildId) {
        timestamps.set(`g_${guildId}`, now + cooldownOptions.guild);
    }

    // Passive Cleanup Strategy: Remove expired entries for this command periodically
    // Note: In highly active bots, a separate interval cleaner would be better.
    if (Math.random() < 0.05) { // 5% chance on each apply to trigger cleanup
        cleanup(commandName);
    }
}

/**
 * Cleanup expired cooldowns for a command.
 */
function cleanup(commandName) {
    const timestamps = cooldowns.get(commandName);
    if (!timestamps) return;
    const now = Date.now();
    for (const [id, expiration] of timestamps.entries()) {
        if (now >= expiration) {
            timestamps.delete(id);
        }
    }
}

module.exports = {
    checkCooldown,
    applyCooldown
};
