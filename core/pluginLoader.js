const fs = require('fs');
const path = require('path');
const commandLoader = require('./commandLoader');
const eventLoader = require('./eventLoader');

module.exports = (client) => {
  const pluginsPath = path.join(__dirname, '../plugins');
  
  if (!fs.existsSync(pluginsPath)) return;

  const pluginFolders = fs.readdirSync(pluginsPath).filter(file => {
    return fs.statSync(path.join(pluginsPath, file)).isDirectory();
  });

  for (const folder of pluginFolders) {
    const pluginPath = path.join(pluginsPath, folder);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      console.log(`[Jack] Skipping plugin folder '${folder}' (missing plugin.json)`);
      continue;
    }

    const manifest = require(manifestPath);
    const mainFile = manifest.main || 'index.js';
    const indexPath = path.join(pluginPath, mainFile);

    if (!fs.existsSync(indexPath)) {
      console.log(`[Jack] Skipping plugin '${manifest.name}' (missing main file: ${mainFile})`);
      continue;
    }

    // Load commands and events for this plugin
    commandLoader(client, pluginPath);
    eventLoader(client, pluginPath);

    // Initialize the plugin
    try {
      const plugin = require(indexPath);
      if (typeof plugin.load === 'function') {
        plugin.load(client);
      }
      console.log(`[Jack] Loaded plugin: ${manifest.name}`);
    } catch (err) {
      console.error(`[Jack] Failed to load plugin '${manifest.name}':`, err);
    }
  }
};
