const mongoose = require('mongoose');
require('dotenv').config();
const GuildConfig = require('../bot/database/models/GuildConfig');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const configs = await GuildConfig.find({});
    console.log(JSON.stringify(configs, null, 2));
    process.exit(0);
}

run();
