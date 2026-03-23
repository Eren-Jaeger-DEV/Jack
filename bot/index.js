require("dotenv").config({ quiet: true });

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { addLog, printLogs } = require("../utils/logger");

addLog("Environment", "Loaded");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GatewayIntentBits ? 0 : GatewayIntentBits.GuildMembers
  ]
});

// Fix for potentially undefined intent bit in older discord.js but usually fine
if (client.options.intents.includes(undefined)) {
    client.options.intents = client.options.intents.filter(i => i !== undefined);
}

client.commands = new Collection();

/* Load Handlers */

require("./handlers/commandHandler")(client);
require("./handlers/eventHandler")(client);

/* Mongo */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => addLog("Database", "Connected"))
  .catch(err => console.error("❌ Database Connection Failed:", err.message));

/* Ready */

client.once("clientReady", async () => {
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