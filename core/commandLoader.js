const fs = require('fs');
const path = require('path');
const logger = require('../bot/utils/logger');

module.exports = (client, pluginPath) => {
  const commandsPath = path.join(pluginPath, 'commands');
  const loadedCommands = [];

  if (!fs.existsSync(commandsPath)) {
    return loadedCommands;
  }

  function loadDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        loadDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        try {
          // Clear cache to ensure fresh load
          delete require.cache[require.resolve(fullPath)];
          const command = require(fullPath);
          if (command.name) {
            client.commands.set(command.name, command);
            loadedCommands.push(command.name);
          } else {
            logger.error("CommandLoader", `Command missing 'name' at ${path.basename(fullPath)}`);
          }
        } catch (err) {
          logger.critical("CommandLoader", `Failed to load command at ${path.basename(fullPath)}: ${err.message}`);
        }
      }
    }
  }

  loadDirectory(commandsPath);
  return loadedCommands;
};
