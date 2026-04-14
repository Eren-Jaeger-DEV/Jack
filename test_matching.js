/**
 * test_matching.js
 * Debugging the matching logic for synergy leaderboard.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./bot/database/models/Player');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  // Test names from user's screenshot
  const testNames = [
    "ZEN | KELLISTO",
    "VOID | KRISH",
    "~KennyY",
    "VOID | NINJA",
    "AJツStranger 彡"
  ];

  const clanMembers = await Player.find({ isClanMember: true });
  console.log(`Found ${clanMembers.length} clan members in DB.`);

  for (const testName of testNames) {
    const target = normalize(testName);
    console.log(`\nTesting: "${testName}" -> normalized: "${target}"`);

    let found = false;
    for (const p of clanMembers) {
      const pIgn = normalize(p.ign);
      const pDiscord = normalize(p.discordName);

      if (pIgn === target) {
        console.log(`✅ MATCH (IGN): ${p.ign}`);
        found = true;
        break;
      }
      if (pDiscord === target) {
        console.log(`✅ MATCH (Discord): ${p.discordName}`);
        found = true;
        break;
      }
      if (pIgn.length > 3 && target.length > 3 && (pIgn.includes(target) || target.includes(pIgn))) {
        console.log(`✅ MATCH (Partial): ${p.ign}`);
        found = true;
        break;
      }
    }
    if (!found) console.log('❌ NO MATCH');
  }

  process.exit(0);
}

test();
