const fs = require('fs');
const path = require('path');

module.exports = (client, pluginPath) => {
  const eventsPath = path.join(pluginPath, 'events');

  if (!fs.existsSync(eventsPath)) return;

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const event = require(path.join(eventsPath, file));
    const eventName = event.name || file.split('.')[0];

    client.on(eventName, (...args) => {
      try {
        if (typeof event === 'function') {
          event(client, ...args);
        } else if (event && typeof event.execute === 'function') {
          event.execute(...args, client);
        }
      } catch (err) {
        console.error(`[Jack] Plugin Event error (${eventName}):`, err);
      }
    });
  }
};
