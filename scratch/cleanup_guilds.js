const mongoose = require('mongoose');
require('dotenv').config();
const GuildConfig = require('../bot/database/models/GuildConfig');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const primaryGuild = process.env.GUILD_ID;
    
    if (!primaryGuild) {
        console.error("GUILD_ID not found in .env");
        process.exit(1);
    }

    console.log(`Primary Guild: ${primaryGuild}`);
    
    const result = await GuildConfig.deleteMany({ guildId: { $ne: primaryGuild } });
    console.log(`Deleted ${result.deletedCount} extra guild configurations.`);
    
    process.exit(0);
}

run();
