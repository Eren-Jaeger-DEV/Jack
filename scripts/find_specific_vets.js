const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');
require('dotenv').config();

async function find() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- FINDING SPECIFIC VETERANS ---');
  
  const dark = await Player.find({ ign: /soul/i });
  const iq = await Player.find({ ign: /ignito/i });
  const ninja = await Player.find({ ign: /eeeu/i });
  
  console.log('DARK Matches:');
  dark.forEach(p => console.log(` - ${p.ign} (${p.discordId})`));
  
  console.log('IGNITO Matches:');
  iq.forEach(p => console.log(` - ${p.ign} (${p.discordId})`));

  console.log('NINJA Matches:');
  ninja.forEach(p => console.log(` - ${p.ign} (${p.discordId})`));

  process.exit(0);
}

find();
