require("dotenv").config({ quiet: true });

const { Client, GatewayIntentBits, Collection, Partials } = require("discord.js");
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
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,          // Required to receive DMs
    GatewayIntentBits.DirectMessageReactions   // Optional but good to have
  ],
  partials: [
    Partials.Channel,  // CRITICAL: DM channels are partial by default — without this, DM events are dropped
    Partials.Message   // Required to read DM message content
  ]
});

client.commands = new Collection();
client.serverMap = new ServerMapManager(client);

/* Load Handlers */
require("./handlers/commandHandler")(client);
require("./handlers/eventHandler")(client);

/* Mongo */
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.addLog("Database", "Connected");
  } catch (err) {
    logger.critical("Database", `Connection Failed: ${err.message}`);
    process.exit(1); // Production: Exit if DB is not available on startup
  }
};

connectDB();

mongoose.connection.on('error', err => {
  logger.error("Database", `Runtime Error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn("Database", "Connection Lost. Attempting to reconnect...");
});

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

/* Graceful Shutdown */
async function shutdown() {
  logger.warn("System", "Shutdown signal received. Cleaning up...");
  try {
    await mongoose.connection.close();
    logger.addLog("Database", "Connection Closed");
    client.destroy();
    logger.addLog("System", "Bot Destroyed");
    process.exit(0);
  } catch (err) {
    logger.error("System", `Shutdown Error: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/* Login */

// DIAGNOSTIC: Raw listener — bypasses all middleware. Remove after DM debugging.
client.on('messageCreate', (msg) => {
  process.stdout.write(`[RAW_MSG] guild=${!!msg.guild} author=${msg.author?.id} content="${(msg.content||"").substring(0,20)}"\n`);
});

client.login(process.env.BOT_TOKEN);

module.exports = client;