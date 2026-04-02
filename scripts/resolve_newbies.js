const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');
require('dotenv').config();

const IDS = [
  "1281919262591811597", "1466143194977927385", "1126496354991091752",
  "1169490424361127951", "1482380980114165891", "802198731058577468",
  "1015263293239210004", "707459243384766495", "1035525922603937814",
  "1207631055436255282"
];

async function resolve() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- RESOLVING NEWBIE IDS ---');
  for (const id of IDS) {
    const p = await Player.findOne({ discordId: id });
    console.log(`${id} -> ${p ? p.ign : 'NOT FOUND'} (${p ? p.discordId : ''})`);
  }
  process.exit(0);
}

resolve();
