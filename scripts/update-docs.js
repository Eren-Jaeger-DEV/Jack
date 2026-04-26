const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '../plugins');
const COMMANDS_MD_PATH = path.join(__dirname, '../COMMANDS.md');
const COMMANDS_TXT_PATH = path.join(__dirname, '../commands_list.txt');

async function generateDocs() {
  console.log('🔍 Scanning plugins for commands (Regex Mode)...');
  
  const plugins = fs.readdirSync(PLUGINS_DIR).filter(f => fs.statSync(path.join(PLUGINS_DIR, f)).isDirectory());
  const allCommands = [];

  for (const plugin of plugins) {
    const commandsPath = path.join(PLUGINS_DIR, plugin, 'commands');
    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
      
      for (const file of commandFiles) {
        const fullPath = path.join(commandsPath, file);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Regex to find name and description without executing the file
        const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
        const descMatch = content.match(/description:\s*['"`]([^'"`]+)['"`]/);
        const catMatch = content.match(/category:\s*['"`]([^'"`]+)['"`]/);

        if (nameMatch) {
          allCommands.push({
            name: nameMatch[1],
            plugin: plugin,
            description: descMatch ? descMatch[1] : 'No description provided.',
            category: catMatch ? catMatch[1] : 'General'
          });
        } else {
          console.warn(`⚠️ Could not find command name in ${file}`);
        }
      }
    }
  }

  // Sort
  allCommands.sort((a, b) => a.plugin.localeCompare(b.plugin) || a.name.localeCompare(b.name));

  // Generate COMMANDS.md
  let mdContent = '# 📜 JACK COMMAND REFERENCE\n\n';
  mdContent += `*Auto-generated on ${new Date().toISOString().split('T')[0]}*\n\n`;
  mdContent += '| Command | Plugin | Category | Description |\n';
  mdContent += '| :--- | :--- | :--- | :--- |\n';

  let txtContent = '';

  for (const cmd of allCommands) {
    mdContent += `| \`/${cmd.name}\` | ${cmd.plugin} | ${cmd.category} | ${cmd.description} |\n`;
    txtContent += `/${cmd.name} - [${cmd.plugin}] ${cmd.description}\n`;
  }

  fs.writeFileSync(COMMANDS_MD_PATH, mdContent);
  fs.writeFileSync(COMMANDS_TXT_PATH, txtContent);

  console.log(`✅ Documentation 100% Sync!`);
  console.log(`   - ${allCommands.length} commands documented.`);
}

generateDocs();
