require("dotenv").config();

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const { printLogs } = require("../utils/logger");

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
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Failed:", err));

/* Ready */

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Load all standalone plugins synchronously
  require("../core/pluginLoader")(client);

  // Print centralized startup logs after plugins have initialized (including async ones)
  setTimeout(() => {
    printLogs();
  }, 10000); // 10s buffer for all async recovery logs
});

/* Login */

client.login(process.env.BOT_TOKEN);

module.exports = client;