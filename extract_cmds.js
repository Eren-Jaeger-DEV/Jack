const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'plugins');
const BOT_COMMANDS_DIR = path.join(__dirname, 'bot', 'commands');

const commands = [];

function parsePermission(runMethodStr) {
  if (!runMethodStr) return 'Everyone';
  const str = runMethodStr.toLowerCase();
  
  if (str.includes('permissions.has("administrator")') || str.includes("permissions.has('administrator')") || str.includes('permissions.has(8n)')) {
    return 'Administrator';
  }
  if (str.includes('permissions.has("manage_messages")')) {
    return 'Moderator';
  }
  if (str.includes('permissions.has("manage_guild")')) {
    return 'Admin / Server Manager';
  }
  if (str.includes('ctx.member.permissions')) {
    // some check is happening
    if (str.includes('admin') || str.includes('mod')) return 'Admin/Moderator';
  }
  // Check if it's admin/owner only
  if (str.includes('owner') || str.includes('admin id')) {
    return 'Bot Owner';
  }
  return 'Everyone';
}

function processDirectory(dir, pluginName = 'core') {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath, pluginName);
    } else if (file.endsWith('.js')) {
      try {
        const cmd = require(fullPath);
        if (cmd.name || (cmd.data && cmd.data.name)) {
          
          let options = [];
          if (cmd.data && typeof cmd.data.toJSON === 'function') {
             const dataJson = cmd.data.toJSON();
             if (dataJson.options) {
               options = dataJson.options.map(o => ({
                 name: o.name,
                 description: o.description,
                 type: o.type,
                 required: o.required
               }));
             }
          }
          
          const runStr = cmd.run ? cmd.run.toString() : '';
          const permission = parsePermission(runStr);

          // Find if there is a category explicitly or just use plugin folder name
          const category = cmd.category || pluginName;

          commands.push({
            plugin: pluginName,
            category: category,
            name: cmd.name || cmd.data.name,
            description: cmd.description || (cmd.data ? cmd.data.description : ''),
            usage: cmd.usage || `/${cmd.name || cmd.data.name}`,
            aliases: cmd.aliases || [],
            details: cmd.details || '',
            options: options,
            permission: permission,
            isSlash: !!cmd.data,
            filepath: fullPath.replace(__dirname, '')
          });
        }
      } catch (err) {
         console.error(`Failed to load ${fullPath}: ${err.message}`);
      }
    }
  }
}

// Check plugins
if (fs.existsSync(PLUGINS_DIR)) {
  const plugins = fs.readdirSync(PLUGINS_DIR);
  for (const plugin of plugins) {
    const pluginDirPath = path.join(PLUGINS_DIR, plugin);
    if (fs.statSync(pluginDirPath).isDirectory()) {
      const commandsDir = path.join(pluginDirPath, 'commands');
      if (fs.existsSync(commandsDir)) {
        processDirectory(commandsDir, plugin);
      } else {
        // sometimes commands are directly in plugin folder or we can just scan the whole plugin
        processDirectory(pluginDirPath, plugin);
      }
    }
  }
}

// Check core commands
if (fs.existsSync(BOT_COMMANDS_DIR)) {
  processDirectory(BOT_COMMANDS_DIR, 'core');
}

fs.writeFileSync(path.join(__dirname, 'cmd_dump.json'), JSON.stringify(commands, null, 2));
console.log(`Extracted ${commands.length} commands.`);
