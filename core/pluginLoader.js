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

    // We proxy the client so we can inject a check before executing events or commands
    const proxyClient = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'commands') {
          return new Proxy(target.commands, {
            get(cmdsTarget, cmdsProp) {
              if (cmdsProp === 'set') {
                return function(name, command) {
                  // Intercept the set call
                  const originalExecute = command.execute;
                  const GuildConfig = require('../bot/database/models/GuildConfig');
                  
                  command.execute = async function(ctx, ...args) {
                    // Always allow outside guilds (DMs) if any, or owner? We check if guildId exists
                    if (ctx.guildId) {
                      const config = await GuildConfig.findOne({ guildId: ctx.guildId });
                      // If plugins field exists and this plugin is set to false, block it
                      if (config && config.plugins && config.plugins[folder] === false) {
                        return ctx.reply({ content: `The **${folder}** plugin is disabled in this server.`, ephemeral: true }).catch(() => {});
                      }
                    }
                    return originalExecute.apply(this, [ctx, ...args]);
                  };
                  return cmdsTarget.set(name, command);
                };
              }
              return Reflect.get(cmdsTarget, cmdsProp);
            }
          });
        }
        
        if (prop === 'on') {
          return function(eventName, listener) {
            const GuildConfig = require('../bot/database/models/GuildConfig');
            
            const wrappedListener = async (...args) => {
              // Try to find a guildId in the first few arguments
              let guildId;
              for (const arg of args) {
                if (arg && arg.guildId) { guildId = arg.guildId; break; }
                if (arg && arg.guild && arg.guild.id) { guildId = arg.guild.id; break; }
              }
              
              if (guildId) {
                const config = await GuildConfig.findOne({ guildId: guildId }).catch(() => null);
                if (config && config.plugins && config.plugins[folder] === false) {
                  return; // Silently ignore the event for this guild
                }
              }
              
              return listener.apply(this, args);
            };
            return target.on(eventName, wrappedListener);
          };
        }
        
        return Reflect.get(target, prop, receiver);
      }
    });

    // Load commands and events for this plugin using the proxied client
    commandLoader(proxyClient, pluginPath);
    eventLoader(proxyClient, pluginPath);

    // Initialize the plugin with the real client to avoid any initialization side effects

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
