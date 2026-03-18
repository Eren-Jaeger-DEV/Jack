const fs = require('fs');
const path = require('path');
const pluginsPath = path.join(__dirname, 'plugins');
const pluginFolders = fs.readdirSync(pluginsPath).filter(f => fs.statSync(path.join(pluginsPath, f)).isDirectory());

let output = "";

for (const folder of pluginFolders) {
  const commandsPath = path.join(pluginsPath, folder, 'commands');
  if (!fs.existsSync(commandsPath)) continue;
  
  function loadDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        loadDir(fullPath);
      } else if (file.endsWith('.js') && !file.includes('eval-stdin')) { // skip weird files
        try {
          const cmd = require(fullPath);
          let name = cmd.name || (cmd.data && cmd.data.name) || "Unknown";
          let desc = cmd.description || (cmd.data && cmd.data.description) || "No description";
          output += `[${folder.toUpperCase()}] Command: ${name}\n  Desc: ${desc}\n  File: ${fullPath.replace(__dirname, '')}\n\n`;
        } catch(e) {
          output += `[${folder.toUpperCase()}] Failed to load: ${fullPath.replace(__dirname, '')}\nError: ${e.message}\n\n`;
        }
      }
    }
  }
  loadDir(commandsPath);
}

fs.writeFileSync('commands_dump.txt', output);
console.log("Commands dumped successfully.");
