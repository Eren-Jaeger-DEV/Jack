const logger = require('../../bot/utils/logger');

/**
 * JACK SAY PLUGIN (v1.0.0)
 * Lifecycle Orchestrator
 */

module.exports = {
    async load(client) {
        logger.info("Say", "Plugin lifecycle: LOADED");
    },
    async unload(client) {
        logger.info("Say", "Plugin lifecycle: UNLOADED");
    }
};
