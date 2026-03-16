const fs = require('fs');
const path = require('path');

module.exports = (client, pluginPath) => {
  const commandsPath = path.join(pluginPath, 'commands');

  if (!fs.existsSync(commandsPath)) return;

  function loadDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        loadDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        const command = require(fullPath);
        if (command.name) {
          client.commands.set(command.name, command);
        }
      }
    }
  }

  loadDirectory(commandsPath);
};
