/**
 * JACK SCHEMA VALIDATOR (v2.1.0)
 * Strict enforcement of plugin, command, and event structures.
 */

const logger = require('../bot/utils/logger');

// Retrieve STRICT_MODE from environment or default to true for safety
const STRICT_MODE = process.env.STRICT_MODE === 'true' || process.env.NODE_ENV !== 'production';

/**
 * Validates a Command object against the blueprint schema.
 */
function validateCommand(command, filePath) {
    const required = ['name', 'category', 'run']; // 'data' is optional for prefix-only commands
    const missing = required.filter(field => !command[field]);

    if (missing.length > 0) {
        return handleFailure("Command", `Missing required fields: ${missing.join(', ')}`, filePath);
    }

    // 1. SlashCommandBuilder check (Only if data is provided)
    if (command.data && typeof command.data.toJSON !== 'function') {
        return handleFailure("Command", "Property 'data' must be an instance of SlashCommandBuilder.", filePath);
    }

    // 2. Permissions check
    if (command.permissions && !Array.isArray(command.permissions)) {
        return handleFailure("Command", "Property 'permissions' must be an Array of bigint/flags.", filePath);
    }

    // 3. Cooldown check
    if (command.cooldown && typeof command.cooldown !== 'object') {
        return handleFailure("Command", "Property 'cooldown' must be an Object { user, guild }.", filePath);
    }

    if (typeof command.run !== 'function') {

        return handleFailure("Command", "Property 'run' must be a function.", filePath);
    }

    return true;
}

/**
 * Validates an Event object against the blueprint schema.
 */
function validateEvent(event, filePath) {
    if (!event.name || typeof event.execute !== 'function') {
        return handleFailure("Event", "Events must export 'name' and 'execute' function.", filePath);
    }
    return true;
}

/**
 * Validates a Plugin manifest (plugin.json).
 */
function validatePlugin(manifest, folder) {
    const required = ['id', 'name', 'version', 'main'];
    const missing = required.filter(field => !manifest[field]);

    if (missing.length > 0) {
        return handleFailure("Plugin", `Manifest missing fields: ${missing.join(', ')}`, folder);
    }
    return true;
}

/**
 * Internal failure handler for STRICT_MODE enforcement.
 */
function handleFailure(type, message, source) {
    const fullMsg = `[Validator] ${type} Validation Failed in ${source}: ${message}`;
    
    if (STRICT_MODE) {
        logger.critical("Validator", fullMsg);
        // In Strict Mode, we treat this as a fatal error
        throw new Error(fullMsg);
    } else {
        logger.error("Validator", fullMsg);
        return false;
    }
}

module.exports = {
    validateCommand,
    validateEvent,
    validatePlugin
};
