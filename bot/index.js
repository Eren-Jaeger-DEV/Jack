require("dotenv").config({ quiet: true });

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { addLog, printLogs } = require("../utils/logger");
global.addLog = addLog;

addLog("Environment", "Loaded");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

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
  
  // Load Advanced Invite Tracker
  try {
    require("../plugins/inviteTrackerAdvanced")(client);
  } catch (err) {
    console.error("❌ Failed to load Advanced Invite Tracker:", err.message);
  }

  // Print centralized startup logs after plugins have initialized (including async ones)
  setTimeout(() => {
    printLogs(client.user.tag);
  }, 10000); // 10s buffer for all async recovery logs
});

/* Login */

client.login(process.env.BOT_TOKEN);

module.exports = client;