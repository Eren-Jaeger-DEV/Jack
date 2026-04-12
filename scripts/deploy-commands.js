/**
 * deploy-commands.js
 *
 * Scans all plugins for commands with a `data` property (SlashCommandBuilder)
 * and registers them globally with Discord's API.
 *
 * Run with: node deploy-commands.js
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

/* SCAN ALL PLUGINS */

const pluginsPath = path.join(__dirname, '..', 'plugins');

function loadCommandsFromDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsFromDir(fullPath);
    } else if (entry.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if ('data' in command && command.data) {
          console.log(`Loaded: ${command.data.name}`);
          commands.push(command.data.toJSON());
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
  loadCommandsFromDir(commandsDir);
}

/* DISCORD REST */

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    const guildId = process.env.GUILD_ID;


    if (guildId) {
      console.log(`🚀 Deploying ${commands.length} commands to guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands }
      );
    } else {
      console.log(`🚀 Deploying ${commands.length} commands globally...`);
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
    }

    console.log('✅ All slash commands registered successfully.');
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
})();