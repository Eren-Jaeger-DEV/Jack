const mongoose = require('mongoose');
require('dotenv').config();
const Season = require('../plugins/seasonal-synergy/models/Season');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const primaryGuild = process.env.GUILD_ID;
    
    const result = await Season.deleteMany({ guildId: { $ne: primaryGuild } });
    console.log(`Deleted ${result.deletedCount} extra seasons.`);
    
    process.exit(0);
}

run();
