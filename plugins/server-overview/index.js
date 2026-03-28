const logger = require('../../bot/utils/logger');

/**
 * JACK SERVER OVERVIEW PLUGIN (v1.0.0)
 * Lifecycle Orchestrator
 */

module.exports = {
    /**
     * Triggered on bot startup or plugin load.
     */
    async load(client) {
        logger.info("ServerOverview", "Plugin lifecycle: LOADED");
    },

    /**
     * Triggered on plugin unload/disable.
     */
    async unload(client) {
        logger.info("ServerOverview", "Plugin lifecycle: UNLOADED");
    },

    /**
     * Triggered when enabled for a specific guild.
     */
    async enable(guild) {
        logger.info("ServerOverview", `Plugin enabled for guild: ${guild.id}`);
    },

    /**
     * Triggered when disabled for a specific guild.
     */
    async disable(guild) {
        logger.info("ServerOverview", `Plugin disabled for guild: ${guild.id}`);
    }
};
