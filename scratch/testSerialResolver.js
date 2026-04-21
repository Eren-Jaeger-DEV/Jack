/**
 * scratch/testSerialResolver.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { resolvePlayer } = require('../bot/utils/playerResolver');
const Player = require('../bot/database/models/Player');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Testing Serial Resolver...');

    // 1. Test JCM lookup
    const jcm01 = await resolvePlayer({ serial: 'JCM01' });
    if (jcm01.player) {
      console.log(`✅ JCM01 found: ${jcm01.player.ign} (${jcm01.player.serialNumber})`);
    } else {
      console.log(`❌ JCM01 NOT found: ${jcm01.error}`);
    }

    // 2. Test Numeric Lookup (2 digits)
    const numeric01 = await resolvePlayer({ serial: '01' });
    if (numeric01.player) {
      console.log(`✅ "01" resolved to: ${numeric01.player.serialNumber} (${numeric01.player.ign})`);
    } else {
      console.log('❌ "01" failed to resolve.');
    }

    // 3. Test JDM lookup
    const jdm0001 = await resolvePlayer({ serial: 'JDM0001' });
    if (jdm0001.player) {
      console.log(`✅ JDM0001 found: ${jdm0001.player.ign} (${jdm0001.player.serialNumber})`);
    } else {
      console.log(`❌ JDM0001 NOT found (might not exist if no guests were in DB)`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
