const fs = require('fs');
const path = require('path');

module.exports = (client, pluginPath) => {
  const commandsPath = path.join(pluginPath, 'commands');
  const loadedCommands = [];

  if (!fs.existsSync(commandsPath)) {
    console.log(`[Jack] Commands directory not found for path: ${commandsPath}`);
    return loadedCommands;
  }

  function loadDirectory(dir) {
    const files = fs.readdirSync(dir);
    console.log(`[Jack] Scanning directory: ${dir}. Files found: [${files.join(', ')}]`);
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
            console.log(`[Jack] Successfully loaded command: ${command.name}`);
          } else {
            console.error(`[Jack] Command file missing 'name' at ${fullPath}`);
          }
        } catch (err) {
          console.error(`[Jack] Critical error loading command at ${fullPath}:`, err);
        }
      }
    }
  }

  loadDirectory(commandsPath);
  return loadedCommands;
};
