const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const fosterService = require('../plugins/foster-program/services/fosterService');
const GuildConfig = require('../bot/database/models/GuildConfig');
require('dotenv').config();

async function run() {
  console.log('🚀 Triggering Split Orientation & Rankings...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    const config = await GuildConfig.findOne();
    if (!config) { console.error('❌ No GuildConfig found.'); process.exit(1); }
    const guildId = config.guildId;

    const program = await fosterService.getActiveProgram(guildId);
    if (!program) { console.error('❌ No active program found.'); process.exit(1); }

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });

    client.once('ready', async () => {
      console.log(`✅ Logged in as ${client.user.tag}`);
      const guild = await client.guilds.fetch(guildId);
      
      // 1. Role Assignment
      console.log('🛡️ Verifying participant roles...');
      for (const pair of program.pairs) {
        const mm = await guild.members.fetch(pair.mentorId).catch(() => null);
        const nm = await guild.members.fetch(pair.partnerId).catch(() => null);
        if (mm) await mm.roles.add(fosterService.ROLES.ADEPT).catch(() => {});
        if (nm) { 
            await nm.roles.add(fosterService.ROLES.NEOPHYTE).catch(() => {});
            await nm.roles.remove(fosterService.ROLES.NEWCOMER).catch(() => {});
        }
      }

      // 2. Post Pairing Orientation Board (↔️)
      console.log('🖼️ Generating Pairing Board & Submission Thread...');
      await fosterService.postOrientation(client, program);

      // 3. Post Dual Leaderboard Board (🏆)
      console.log('📊 Generating Dual Leaderboard Rankings...');
      await fosterService.refreshLeaderboard(client, program);
      
      console.log('✨ Split-Update Complete!');
      process.exit(0);
    });

    client.login(process.env.BOT_TOKEN);
  } catch (err) {
    console.error('❌ Error during trigger:', err);
    process.exit(1);
  }
}

run();
