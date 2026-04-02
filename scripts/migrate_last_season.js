const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');
require('dotenv').config();

const EXCLUDED_IDS = [
  "1281919262591811597", "1466143194977927385", "1126496354991091752",
  "1169490424361127951", "1482380980114165891", "802198731058577468",
  "1015263293239210004", "707459243384766495", "1035525922603937814",
  "1207631055436255282"
];

const LAST_SEASON_MAP = [
  { name: "KennyY", points: 47226 },
  { name: "VOID", points: 47021 },
  { name: "False NINJA", points: 38701 },
  { name: "Boogeyman", points: 38411 },
  { name: "Kezzo", points: 36062 },
  { name: "IND ADI", points: 35936 },
  { name: "Oye LANKESH", points: 34806 },
  { name: "ASURxTEERTH", points: 32957 },
  { name: "A R S E", points: 32644 },
  { name: "TSxAbhishekkk", points: 31387 },
  { name: "vijay", points: 27960 },
  { name: "SaNaTaNi", points: 27011 },
  { name: "L E V I", points: 24626 },
  { name: "STONECHAD", points: 20546 },
  { name: "gxolsunuverma", points: 20464 }
];

async function run() {
  console.log('🚀 Starting Data Migration for Last Season Synergy...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Reset all lastSeasonSynergy for safety
    await Player.updateMany({}, { $set: { lastSeasonSynergy: 0 } });
    console.log('✅ Reset all players lastSeasonSynergy to 0.');

    // 3. Process Top 15 from Image (Match by IGN partial)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    let mappedCount = 0;
    for (const entry of LAST_SEASON_MAP) {
      // Use just the first part of the name for better matching with special symbols
      const searchName = entry.name.split(' ')[0].split('|')[0].trim();
      const query = { ign: new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
      
      const players = await Player.find(query);
      
      if (players.length > 0) {
        for (const p of players) {
          // Skip if explicitly excluded
          if (EXCLUDED_IDS.includes(p.discordId)) {
            console.log(`   🚫 Skipped Excluded Player: ${p.ign} (${p.discordId})`);
            continue;
          }

          // Update points and ensure join date allows mentoring (>30 days)
          p.lastSeasonSynergy = entry.points;
          if (!p.clanJoinDate || p.clanJoinDate > sixtyDaysAgo) {
            p.clanJoinDate = sixtyDaysAgo;
          }
          await p.save();
          mappedCount++;
          console.log(`   🔸 Mapped: ${p.ign} -> ${entry.points} pts (Join Date Adjusted)`);
        }
      } else {
        // Try fallback for some very specific ones
        const fallbacks = {
          "KennyY": "Kenn",
          "False NINJA": "NINJA",
          "IND ADI": "ADI",
          "Oye LANKESH": "LANKESH",
          "A R S E": "S E",
          "TSxAbhishekkk": "Abhishek",
          "L E V I": "LEVI"
        };
        const fb = fallbacks[entry.name];
        if (fb) {
          const fbPlayers = await Player.find({ ign: new RegExp(fb, 'i') });
          if (fbPlayers.length > 0) {
             for (const p of fbPlayers) {
                if (EXCLUDED_IDS.includes(p.discordId)) continue;
                p.lastSeasonSynergy = entry.points;
                if (!p.clanJoinDate || p.clanJoinDate > sixtyDaysAgo) p.clanJoinDate = sixtyDaysAgo;
                await p.save();
                mappedCount++;
                console.log(`   🔸 Mapped (Fallback): ${p.ign} -> ${entry.points} pts`);
             }
             continue;
          }
        }
        console.log(`   ⚠️ Still could not find player matching: ${entry.name}`);
      }
    }

    // 4. Final safety exclusion
    const excludedResult = await Player.updateMany(
      { discordId: { $in: EXCLUDED_IDS } },
      { $set: { lastSeasonSynergy: 0 } }
    );
    console.log(`✅ Final safety: Ensured ${excludedResult.modifiedCount} "new players" have 0 lastSeasonSynergy.`);

    console.log(`\n✨ Migration complete. Total ${mappedCount} veterans mapped.`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal Error during migration:', err);
    process.exit(1);
  }
}

run();
