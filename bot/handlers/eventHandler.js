const fs = require("fs");
const path = require("path");

module.exports = (client) => {

  const eventsPath = path.join(__dirname, "..", "events");

  const files = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of files) {

    const event = require(`${eventsPath}/${file}`);
    const eventName = event.name || file.split(".")[0];

    client.on(eventName, (...args) => {

      try {

        // function style events
        if (typeof event === "function") {
          event(client, ...args);
        }

        // object style events
        else if (event && typeof event.execute === "function") {
          event.execute(...args, client);
        }

      } catch (err) {
        console.error(`Event error (${eventName}):`, err);
      }

    });

    console.log(`Loaded event: ${eventName}`);

  }

};