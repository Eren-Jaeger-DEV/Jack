const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const top15 = await Player.find({ lastSeasonSynergy: { $gt: 0 } }).sort({ lastSeasonSynergy: -1 }).limit(15);
  
  console.log('--- TOP 15 BY LAST SEASON SYNERGY ---');
  top15.forEach((p, i) => {
    console.log(`${i+1}. ${p.ign} (${p.discordId}) - ${p.lastSeasonSynergy} pts - Joined: ${p.clanJoinDate}`);
  });
  
  process.exit(0);
}

check();
