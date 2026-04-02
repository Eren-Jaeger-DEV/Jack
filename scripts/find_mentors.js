const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');
require('dotenv').config();

const NEWBIES = [
  "1281919262591811597", "1466143194977927385", "1126496354991091752",
  "1169490424361127951", "1482380980114165891", "802198731058577468",
  "1015263293239210004", "707459243384766495", "1035525922603937814",
  "1207631055436255282"
];

async function findMentors() {
  await mongoose.connect(process.env.MONGODB_URI);
  const mentors = await Player.find({ 
    discordId: { $nin: NEWBIES },
    lastSeasonSynergy: { $gt: 0 }
  }).sort({ lastSeasonSynergy: -1 }).limit(10);

  console.log('--- TOP ELIGIBLE MENTORS ---');
  mentors.forEach((p, i) => {
    console.log(`${i+1}. ${p.ign} (${p.discordId}) - ${p.lastSeasonSynergy} pts`);
  });

  process.exit(0);
}

findMentors();
