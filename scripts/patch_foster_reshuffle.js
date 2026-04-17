const mongoose = require('mongoose');
require('dotenv').config();
const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const Player = require('../bot/database/models/Player');

const KATHAN_ID = '1482380980114165891';
const WITCH_ID = '702103167654952970';
const KENNY_ID = '1415693094397153444';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function runPatch() {
  console.log('🔄 Starting Foster Program Patch (Swap & Reshuffle)...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Database.');

    const program = await FosterProgram.findOne({ active: true });
    if (!program) {
      console.error('❌ No active Foster Program found!');
      process.exit(1);
    }

    console.log(`📍 Current State: Term ${program.term}, Cycle ${program.cycle}`);

    // 1. Swap participant in registration pool
    const regIdx = program.registration.registeredNeophytes.indexOf(KATHAN_ID);
    if (regIdx !== -1) {
      program.registration.registeredNeophytes[regIdx] = WITCH_ID;
      console.log('✅ Swapped Kathan for Witch in registration pool.');
    } else {
        // If they were registered as Veteran
        const vetIdx = program.registration.registeredVeterans.indexOf(KATHAN_ID);
        if (vetIdx !== -1) {
            program.registration.registeredVeterans[vetIdx] = WITCH_ID;
            console.log('✅ Swapped Kathan for Witch in registration pool (Veteran).');
        }
    }

    // 2. Prepare Reshuffle
    // Extract current Mentors and Partners
    const mentors = program.pairs.map(p => p.mentorId);
    let partners = program.pairs.map(p => p.partnerId);

    // Replace Kathan in partner list if present
    const partnerIdx = partners.indexOf(KATHAN_ID);
    if (partnerIdx !== -1) {
      partners[partnerIdx] = WITCH_ID;
    } else {
        // Just in case Witch is already there or Kathan isn't
        if (!partners.includes(WITCH_ID)) {
             console.warn('⚠️ Witch not found in partners, adding manually...');
             // This shouldn't happen if they are replacing a partner
        }
    }

    console.log('🎲 Performing unique reshuffle with constraints...');

    // Separate KennY and Witch as the fixed pair
    const otherMentors = mentors.filter(id => id !== KENNY_ID);
    const otherPartners = partners.filter(id => id !== WITCH_ID);

    let newPairs = [{ mentorId: KENNY_ID, partnerId: WITCH_ID, points: 0, initialPoints: 0 }];
    
    let attempts = 0;
    let success = false;
    while (attempts < 1000) {
      const shuffledPartners = shuffleArray([...otherPartners]);
      let ok = true;
      for (let i = 0; i < otherMentors.length; i++) {
        const mId = otherMentors[i];
        const pId = shuffledPartners[i];
        
        // Check uniqueness against previousPairs (Cycle 1)
        const isDuplicate = program.previousPairs.some(pp => pp[0] === mId && pp[1] === pId);
        if (isDuplicate) {
          ok = false;
          break;
        }
      }
      
      if (ok) {
        for (let i = 0; i < otherMentors.length; i++) {
          newPairs.push({ mentorId: otherMentors[i], partnerId: shuffledPartners[i], points: 0, initialPoints: 0 });
        }
        success = true;
        break;
      }
      attempts++;
    }

    if (!success) {
      console.warn('⚠️ Could not find a 100% unique shuffle after 1000 attempts. Reverting to basic shuffle for other 5 pairs.');
      const shuffledPartners = shuffleArray([...otherPartners]);
      for (let i = 0; i < otherMentors.length; i++) {
        newPairs.push({ mentorId: otherMentors[i], partnerId: shuffledPartners[i], points: 0, initialPoints: 0 });
      }
    }

    // 3. Finalize
    program.pairs = newPairs;
    program.pendingSubmissions = []; // Reset cycle progress
    program.submittedThisCycle = [];
    program.lastRotation = new Date();
    
    await program.save();
    console.log('✅ Program updated successfully with 6 new pairs.');
    console.log('\n✨ New Pairings (Cycle 2 Reset):');
    for (const pair of newPairs) {
      console.log(`   🤝 ${pair.mentorId} + ${pair.partnerId}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Patch Failed:', err);
    process.exit(1);
  }
}

runPatch();
