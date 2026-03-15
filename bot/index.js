require("dotenv").config();

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");

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
  
  // Preload Canvas Leveling Backgrounds
  const { preloadBackgrounds } = require("./modules/leveling/backgroundCache");
  await preloadBackgrounds();

  // Start the background XP flush worker
  require("./modules/leveling/xpWorker")(client);
});

/* Login */

client.login(process.env.BOT_TOKEN);

module.exports = client;