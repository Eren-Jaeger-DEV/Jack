
const mongoose = require('mongoose');
require('dotenv').config();

const FosterProgram = require('./plugins/foster-program/models/FosterProgram');
const Player = require('./bot/database/models/Player');

async function checkSwap() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const oldPlayer = await Player.findOne({ discordId: '1482380980114165891' });
    const newPlayer = await Player.findOne({ discordId: '702103167654952970' });
    
    console.log('Old Player:', oldPlayer ? oldPlayer.ign : 'Not found');
    console.log('New Player:', newPlayer ? newPlayer.ign : 'Not found');
    
    const program = await FosterProgram.findOne({ active: true });
    if (program) {
        const isOldIn = program.pairs.some(p => p.mentorId === '1482380980114165891' || p.partnerId === '1482380980114165891');
        const isNewIn = program.pairs.some(p => p.mentorId === '702103167654952970' || p.partnerId === '702103167654952970');
        console.log('Is Old in Program?', isOldIn);
        console.log('Is New already in Program?', isNewIn);
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkSwap();
