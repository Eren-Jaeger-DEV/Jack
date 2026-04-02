const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const fosterService = require('../plugins/foster-program/services/fosterService');
const configManager = require('../bot/utils/configManager');
const GuildConfig = require('../bot/database/models/GuildConfig');
require('dotenv').config();

async function run() {
  console.log('🚀 Starting Foster Program Shutdown...');

  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 2. Initialize Discord Client
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
      ]
    });

    await client.login(process.env.BOT_TOKEN);
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Waiting for cache to fill
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Process all guilds
    const configs = await GuildConfig.find({});
    console.log(`🔍 Found ${configs.length} guild configurations.`);

    for (const configDoc of configs) {
      const guildId = configDoc.guildId;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        console.log(`⚠️ Skipping Guild ${guildId} (Not in cache/Not joined).`);
        continue;
      }

      console.log(`⚙️ Processing Guild: ${guild.name} (${guildId})`);

      // A. End the program (Role removal, data deactivation)
      const result = await fosterService.endProgram(guild, client);
      if (result.success) {
        console.log(`   ✅ Active program terminated and roles cleaned up.`);
      } else {
        console.log(`   ℹ️ ${result.error || 'No active program found to stop.'}`);
      }

      // B. Disable the plugin in Config
      await GuildConfig.updateOne(
        { guildId },
        { 
          $set: { 
            "plugins.foster-program": false,
            "plugins.channelManagement": false // Optional: Disable as requested or as part of the "big flaw" cleanup
          } 
        }
      );
      console.log(`   ✅ Foster Program plugin disabled in GuildConfig.`);
    }

    console.log('\n✨ Shutdown sequence complete.');
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal Error during shutdown:', err);
    process.exit(1);
  }
}

run();
