const fs = require('fs');
const path = require('path');
const commandLoader = require('./commandLoader');
const eventLoader = require('./eventLoader');
const { addLog } = require('../utils/logger');
const configManager = require('../bot/utils/configManager');

const activePluginComponents = new Map(); // folder -> { commands: [], events: [] }

/**
 * Loads a single plugin's commands and events.
 */
function loadPlugin(client, folder) {
  if (activePluginComponents.has(folder)) return;

  const pluginsPath = path.join(__dirname, '../plugins');
  const pluginPath = path.join(pluginsPath, folder);
  const manifestPath = path.join(pluginPath, 'plugin.json');

  if (!fs.existsSync(manifestPath)) return;

  // Clear cache for manifest and index if they exist
  try {
    delete require.cache[require.resolve(manifestPath)];
  } catch (e) {}
  
  const manifest = require(manifestPath);
  const mainFile = manifest.main || 'index.js';
  const indexPath = path.join(pluginPath, mainFile);

  // 1. Load Commands
  const loadedCommands = commandLoader(client, pluginPath);
  
  // 2. Load Events
  const loadedEvents = eventLoader(client, pluginPath);

  // 3. Optional Init Function
  if (fs.existsSync(indexPath)) {
    try {
      delete require.cache[require.resolve(indexPath)];
      const plugin = require(indexPath);
      if (typeof plugin.load === 'function') {
        plugin.load(client);
      }
    } catch (err) {
      console.error(`[Jack] Failed to run init for plugin '${folder}':`, err.message);
    }
  }

  activePluginComponents.set(folder, {
    commands: loadedCommands,
    events: loadedEvents
  });

  console.log(`[Plugins] Successfully initialized ${folder} (${loadedCommands.length} cmds, ${loadedEvents.length} events)`);
  addLog("Plugins", `Loaded active plugin: ${folder}`);
}

/**
 * Unloads a single plugin's commands and events.
 */
function unloadPlugin(client, folder) {
  const components = activePluginComponents.get(folder);
  if (!components) return;

  // 1. Remove Commands
  components.commands.forEach(cmdName => {
    client.commands.delete(cmdName);
  });

  // 2. Remove Events
  components.events.forEach(({ eventName, handler }) => {
    client.removeListener(eventName, handler);
  });

  activePluginComponents.delete(folder);
  addLog("Plugins", `Unloaded plugin: ${folder}`);
}

module.exports = (client) => {
  const pluginsPath = path.join(__dirname, '../plugins');
  if (!fs.existsSync(pluginsPath)) return;

  /**
   * Public toggle function attached to client
   */
  client.togglePlugin = (folder, enabled) => {
    if (enabled) {
      loadPlugin(client, folder);
    } else {
      unloadPlugin(client, folder);
    }
  };

  const init = async () => {
    const pluginFolders = fs.readdirSync(pluginsPath).filter(file => {
      return fs.statSync(path.join(pluginsPath, file)).isDirectory();
    });

    const GUILD_ID = process.env.GUILD_ID;
    if (!GUILD_ID) {
      console.warn("⚠️ [Plugins] GUILD_ID not found in environment. Skipping dynamic plugin loading.");
      addLog("Plugins", "GUILD_ID missing; skipping dynamic load");
      return;
    }

    const config = await configManager.getGuildConfig(GUILD_ID);
    const enabledPlugins = config?.plugins || {};

    let count = 0;
    for (const folder of pluginFolders) {
      // Check if enabled in config cache
      if (enabledPlugins[folder] === true) {
        console.log(`[Plugins] Loading enabled plugin: ${folder}`);
        loadPlugin(client, folder);
        count++;
      }
    }

    console.log(`[Plugins] ${count} active plugins initialized`);
    addLog("Plugins", `${count} active plugins initialized`);
  };

  init();
};
