const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '../plugins');
const COMMANDS_MD_PATH = path.join(__dirname, '../COMMANDS.md');
const COMMANDS_TXT_PATH = path.join(__dirname, '../commands_list.txt');

async function generateDocs() {
  console.log('🔍 Scanning plugins for commands...');
  
  const plugins = fs.readdirSync(PLUGINS_DIR).filter(f => fs.statSync(path.join(PLUGINS_DIR, f)).isDirectory());
  const allCommands = [];

  for (const plugin of plugins) {
    const commandsPath = path.join(PLUGINS_DIR, plugin, 'commands');
    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
      
      for (const file of commandFiles) {
        try {
          const command = require(path.join(commandsPath, file));
          if (command.name) {
            allCommands.push({
              name: command.name,
              plugin: plugin,
              description: command.data?.description || 'No description provided.',
              category: command.category || 'General'
            });
          }
        } catch (e) {
          console.error(`❌ Failed to parse command ${file} in ${plugin}: ${e.message}`);
        }
      }
    }
  }

  // Sort by plugin then name
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

  console.log(`✅ Documentation updated!`);
  console.log(`   - ${allCommands.length} commands documented.`);
  console.log(`   - Created: ${COMMANDS_MD_PATH}`);
  console.log(`   - Updated: ${COMMANDS_TXT_PATH}`);
}

generateDocs();
