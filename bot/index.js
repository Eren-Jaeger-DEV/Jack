require("dotenv").config({ quiet: true });

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { addLog, printLogs } = logger;
const configManager = require("./utils/configManager");
const ServerMapManager = require("../core/serverMapManager");
global.addLog = addLog;

addLog("Environment", "Loaded");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites
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
  .then(() => addLog("Database", "Connected"))
  .catch(err => logger.critical("Database", `Connection Failed: ${err.message}`));

/* Ready */

client.once("clientReady", async () => {

  // Initialize configuration cache
  await configManager.init(client);

  // Initialize the server map dynamically
  const guild = client.guilds.cache.first();
  if (guild) {
    await client.serverMap.init(guild);
  }

  // Hook in the automatic rotating presence mechanism
  const { startDefaultPresenceRotation } = require("./utils/presenceManager");
  startDefaultPresenceRotation(client);

  // Load all standalone plugins synchronously
  require("../core/pluginLoader")(client);
  
  // Print centralized startup logs after plugins have initialized (including async ones)
  setTimeout(() => {
    printLogs(client.user.tag);
  }, 10000); // 10s buffer for all async recovery logs
});

/* Login */

client.login(process.env.BOT_TOKEN);

module.exports = client;