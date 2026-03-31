const mongoose = require('mongoose');
const GuildConfig = require('./bot/database/models/GuildConfig');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const config = await GuildConfig.findOne({ guildId: process.env.GUILD_ID });
    console.log('Guild Config:', JSON.stringify(config, null, 2));
    await mongoose.disconnect();
}

check();
