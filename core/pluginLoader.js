const fs = require('fs');
const path = require('path');
const commandLoader = require('./commandLoader');
const eventLoader = require('./eventLoader');
const { addLog } = require('../utils/logger');

module.exports = (client) => {
  const pluginsPath = path.join(__dirname, '../plugins');
  
  if (!fs.existsSync(pluginsPath)) return;

  const pluginFolders = fs.readdirSync(pluginsPath).filter(file => {
    return fs.statSync(path.join(pluginsPath, file)).isDirectory();
  });

  let pluginCount = 0;

  for (const folder of pluginFolders) {
    const pluginPath = path.join(pluginsPath, folder);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) continue;

    const manifest = require(manifestPath);
    const mainFile = manifest.main || 'index.js';
    const indexPath = path.join(pluginPath, mainFile);

    if (!fs.existsSync(indexPath)) continue;

    const proxyClient = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'commands') {
          return new Proxy(target.commands, {
            get(cmdsTarget, cmdsProp) {
              if (cmdsProp === 'set') {
                return function(name, command) {
                  const originalExecute = command.execute;
                  const GuildConfig = require('../bot/database/models/GuildConfig');
                  
                  command.execute = async function(ctx, ...args) {
                    if (ctx.guildId) {
                      const config = await GuildConfig.findOne({ guildId: ctx.guildId });
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
              let guildId;
              for (const arg of args) {
                if (arg && arg.guildId) { guildId = arg.guildId; break; }
                if (arg && arg.guild && arg.guild.id) { guildId = arg.guild.id; break; }
              }
              
              if (guildId) {
                const config = await GuildConfig.findOne({ guildId: guildId }).catch(() => null);
                if (config && config.plugins && config.plugins[folder] === false) return;
              }
              return listener.apply(this, args);
            };
            return target.on(eventName, wrappedListener);
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });

    commandLoader(proxyClient, pluginPath);
    eventLoader(proxyClient, pluginPath);

    try {
      const plugin = require(indexPath);
      if (typeof plugin.load === 'function') {
        plugin.load(client);
      }
      pluginCount++;
    } catch (err) {
      console.error(`[Jack] Failed to load plugin '${manifest.name}':`, err.message);
    }
  }

  addLog("Plugins", `${pluginCount} loaded`);
};
