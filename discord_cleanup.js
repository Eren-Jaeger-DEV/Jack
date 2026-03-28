require("dotenv").config({ quiet: true });
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DB_CHANNEL_ID = '1486990546672291911';

async function run() {
  try {
    console.log("Logging in...");
    await client.login(process.env.BOT_TOKEN);
    console.log("Connected.");

    const channel = await client.channels.fetch(DB_CHANNEL_ID);
    const fetched = await channel.threads.fetchActive();
    
    console.log(`Found ${fetched.threads.size} active threads.`);

    for (const [, thread] of fetched.threads) {
      console.log(`Processing thread: ${thread.name}`);
      const messages = await thread.messages.fetch({ limit: 100 });
      
      for (const msg of messages.values()) {
        if (msg.author.id !== client.user.id) continue;
        if (msg.content.includes("Rarity:")) {
          const newContent = msg.content
            .split("\n")
            .filter(line => !line.toLowerCase().startsWith("rarity:"))
            .join("\n")
            .trim();
          
          if (newContent !== msg.content) {
            console.log(`Editing message in ${thread.name}...`);
            await msg.edit({ content: newContent });
          }
        }
      }
    }

    console.log("Discord message cleanup complete! ✅");

  } catch (err) {
    console.error("Discord Cleanup Error:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
}

run();
