const fs = require('fs');
const path = require('path');

module.exports = (client, pluginPath) => {
  const commandsPath = path.join(pluginPath, 'commands');
  const loadedCommands = [];

  if (!fs.existsSync(commandsPath)) return loadedCommands;

  function loadDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        loadDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        try {
          // Clear cache to ensure fresh load if re-loading
          delete require.cache[require.resolve(fullPath)];
          const command = require(fullPath);
          if (command.name) {
            client.commands.set(command.name, command);
            loadedCommands.push(command.name);
          }
        } catch (err) {
          console.error(`[Jack] Failed to load command at ${fullPath}:`, err.message);
        }
      }
    }
  }

  loadDirectory(commandsPath);
  return loadedCommands;
};
