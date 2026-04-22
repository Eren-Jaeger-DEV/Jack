const fs = require("fs");
const path = require("path");
const logger = require('../../utils/logger');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "..", "events");
  const files = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of files) {
    try {
      const event = require(`${eventsPath}/${file}`);
      const eventName = event.name || file.split(".")[0];
      console.log(`[EventHandler] Registering event: ${eventName}`);

      client.on(eventName, (...args) => {
        try {
          if (typeof event === "function") {
            event(client, ...args);
          } else if (event && typeof event.execute === "function") {
            event.execute(...args, client);
          }
        } catch (err) {
          logger.error("EventHandler", `Core Event error (${eventName}): ${err.message}`);
        }
      });

      logger.startupStats.events.loaded++;
    } catch (err) {
      logger.error("EventHandler", `Failed to load event file ${file}: ${err.message}`);
      logger.startupStats.events.failed++;
    }
  }
};