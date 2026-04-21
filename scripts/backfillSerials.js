/**
 * scripts/backfillSerials.js
 * 
 * One-time script to assign serial numbers to existing players.
 * Sorts by createdAt to preserve historical order.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');

const prefixJCM = 'JCM';
const prefixJDM = 'JDM';

async function backfill() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // 1. Fetch all players without serialNumber, sorted by createdAt
    const players = await Player.find({ serialNumber: { $exists: false } }).sort({ createdAt: 1 });
    console.log(`Found ${players.length} players to backfill.`);

    if (players.length === 0) {
      console.log('No players need backfilling.');
      process.exit(0);
    }

    // 2. Get current highest numbers to start from (in case some were already added)
    const lastJCM = await Player.findOne({ serialNumber: /^JCM\d+$/ }).sort({ serialNumber: -1 }).lean();
    const lastJDM = await Player.findOne({ serialNumber: /^JDM\d+$/ }).sort({ serialNumber: -1 }).lean();

    let nextJCM = 1;
    if (lastJCM) {
      nextJCM = parseInt(lastJCM.serialNumber.replace('JCM', ''), 10) + 1;
    }

    let nextJDM = 1;
    if (lastJDM) {
      nextJDM = parseInt(lastJDM.serialNumber.replace('JDM', ''), 10) + 1;
    }

    console.log(`Starting JCM from ${nextJCM}, JDM from ${nextJDM}`);

    let updatedCount = 0;
    for (const player of players) {
      const isClan = player.isClanMember;
      const prefix = isClan ? prefixJCM : prefixJDM;
      const padding = isClan ? 3 : 4;
      const number = isClan ? nextJCM++ : nextJDM++;
      
      const serial = `${prefix}${String(number).padStart(padding, '0')}`;
      
      player.serialNumber = serial;
      await player.save();
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount}/${players.length}...`);
      }
    }

    console.log(`✅ Successfully backfilled ${updatedCount} players.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

backfill();
