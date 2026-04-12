const fs = require('fs');
const path = require('path');
const logger = require('../bot/utils/logger');

module.exports = (client, pluginPath) => {
  const eventsPath = path.join(pluginPath, 'events');
  const loadedEvents = [];

  if (!fs.existsSync(eventsPath)) return loadedEvents;

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const fullPath = path.join(eventsPath, file);
    try {
      // Clear cache to ensure fresh load
      delete require.cache[require.resolve(fullPath)];
      const event = require(fullPath);
      const eventName = event.name || file.split('.')[0];

      const handler = (...args) => {
        try {
          if (typeof event === 'function') {
            event(client, ...args);
          } else if (event && typeof event.execute === 'function') {
            event.execute(...args, client);
          }
        } catch (err) {
          logger.error("EventLoader", `Plugin Event error (${eventName}): ${err.message}`);
        }
      };

      client.on(eventName, handler);
      logger.info("EventLoader", `Loaded event: ${eventName}`);
      loadedEvents.push({ eventName, handler });
    } catch (err) {
      logger.critical("EventLoader", `Failed to load event at ${path.basename(fullPath)}: ${err.message}`);
    }
  }

  return loadedEvents;
};
