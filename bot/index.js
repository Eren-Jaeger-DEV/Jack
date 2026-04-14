require("dotenv").config({ quiet: true });

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const logger = require('../utils/logger');
const configManager = require("./utils/configManager");
const ServerMapManager = require("../core/serverMapManager");

logger.addLog("Environment", "Loaded");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();
client.serverMap = new ServerMapManager(client);

/* Load Handlers */
require("./handlers/commandHandler")(client);
require("./handlers/eventHandler")(client);

/* Mongo */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.addLog("Database", "Connected"))
  .catch(err => logger.critical("Database", `Connection Failed: ${err.message}`));

/* Ready */

client.once("clientReady", async () => {
  // Initialize configuration cache
  await configManager.init(client);

  // Initialize the server map dynamically
  const guild = client.guilds.cache.first() || client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await client.serverMap.init(guild);
  }

  // Hook in the automatic rotating presence mechanism
  const { startDefaultPresenceRotation } = require("./utils/presenceManager");
  startDefaultPresenceRotation(client);

  // Load all standalone plugins
  await require("../core/pluginLoader")(client);
  
  // High-End Boot Report (shorter buffer for final async consistency)
  setTimeout(() => {
    logger.showBootReport(client);
  }, 1500); 
});

/* Login */

client.login(process.env.BOT_TOKEN);

module.exports = client;