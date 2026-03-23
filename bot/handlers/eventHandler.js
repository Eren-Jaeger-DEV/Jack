const fs = require("fs");
const path = require("path");
const { addLog } = require("../../utils/logger");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "..", "events");
  const files = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

  let eventCount = 0;

  for (const file of files) {
    const event = require(`${eventsPath}/${file}`);
    const eventName = event.name || file.split(".")[0];

    client.on(eventName, (...args) => {
      try {
        if (typeof event === "function") {
          event(client, ...args);
        } else if (event && typeof event.execute === "function") {
          event.execute(...args, client);
        }
      } catch (err) {
        console.error(`Event error (${eventName}):`, err);
      }
    });

    eventCount++;
  }

  addLog("Events", `${eventCount} loaded`);
};