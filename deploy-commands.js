require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];

/* READ COMMAND FILES */

const commandFolders = fs.readdirSync('./bot/commands');

for (const folder of commandFolders) {

  const commandFiles = fs
    .readdirSync(`./bot/commands/${folder}`)
    .filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {

    const command = require(`./bot/commands/${folder}/${file}`);

    if ('data' in command) {
      console.log("Loaded:", command.data.name);
     commands.push(command.data.toJSON());
     }
      
  

  }
}

/* DISCORD REST */

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {

  try {

    console.log(`🚀 Deploying ${commands.length} commands...`);

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ Slash commands updated.');

  } catch (error) {
    console.error(error);
  }

})();