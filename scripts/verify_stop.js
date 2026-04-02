const mongoose = require('mongoose');
const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const GuildConfig = require('../bot/database/models/GuildConfig');
require('dotenv').config();

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const activePrograms = await FosterProgram.find({ active: true });
  console.log('Active Programs in DB:', activePrograms.length);

  const configs = await GuildConfig.find({});
  configs.forEach(c => {
    console.log(`Guild ${c.guildId} Foster Plugin Enabled:`, c.plugins['foster-program']);
    console.log(`Guild ${c.guildId} Channel Management Enabled:`, c.plugins['channelManagement']);
  });

  process.exit(0);
}

verify();
