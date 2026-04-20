/**
 * dump_commands.js
 *
 * Scans all plugins for commands and exports their metadata
 * to data/docs/cmd_dump.json for manual generation.
 */

const fs = require('fs');
const path = require('path');

const commands = [];
const pluginsPath = path.join(__dirname, '..', 'plugins');

function loadCommandsFromDir(dir, pluginName) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsFromDir(fullPath, pluginName);
    } else if (entry.endsWith('.js')) {
      try {
        // Clear cache to ensure fresh load
        delete require.cache[require.resolve(fullPath)];
        const command = require(fullPath);
        
        if (command.name) {
          const data = {
            name: command.name,
            aliases: command.aliases || [],
            description: command.description || (command.data ? command.data.description : 'No description'),
            usage: command.usage || `/${command.name}`,
            details: command.details || 'None',
            permission: command.permission || (command.category === 'admin' ? 'Administrator' : 'Everyone'),
            plugin: pluginName,
            category: command.category || 'General',
            isSlash: !!command.data,
            options: []
          };

          if (command.data) {
            const json = command.data.toJSON();
            if (json.options) {
              data.options = json.options.map(opt => ({
                name: opt.name,
                description: opt.description,
                type: opt.type,
                required: opt.required || false
              }));
            }
          }

          commands.push(data);
          console.log(`Loaded: ${pluginName}/${command.name}`);
        }
      } catch (err) {
        console.error(`Failed to load ${fullPath}:`, err.message);
      }
    }
  }
}

const pluginFolders = fs.readdirSync(pluginsPath).filter(f =>
  fs.statSync(path.join(pluginsPath, f)).isDirectory()
);

for (const folder of pluginFolders) {
  const commandsDir = path.join(pluginsPath, folder, 'commands');
  loadCommandsFromDir(commandsDir, folder);
}

const outPath = path.join(__dirname, '..', 'data', 'docs', 'cmd_dump.json');
if (!fs.existsSync(path.dirname(outPath))) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(commands, null, 2));
console.log(`\n✅ Exported ${commands.length} commands to ${outPath}`);
