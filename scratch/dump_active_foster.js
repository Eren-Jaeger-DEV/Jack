const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const Player = require('../bot/database/models/Player');

async function dumpActiveProgram() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const program = await FosterProgram.findOne({ active: true });
        if (!program) {
            console.log('No active program found.');
            return;
        }

        console.log('\n=== ACTIVE PROGRAM DUMP ===');
        console.log(`ID: ${program._id}`);
        console.log(`Status: ${program.status}`);
        console.log(`Term: ${program.term}, Cycle: ${program.cycle}`);
        console.log(`Submission Thread ID: ${program.submissionThreadId}`);
        
        console.log('\n--- PAIRS ---');
        for (const pair of program.pairs) {
            const m = await Player.findOne({ discordId: pair.mentorId });
            const p = await Player.findOne({ discordId: pair.partnerId });
            console.log(`Mentor: ${m?.ign || pair.mentorId} (${pair.mentorId})`);
            console.log(`Partner: ${p?.ign || pair.partnerId} (${pair.partnerId})`);
            console.log(`Mentor Start: ${pair.mentorInitial}, Partner Start: ${pair.partnerInitial}`);
            console.log(`Mentor End: ${pair.mentorFinal}, Partner End: ${pair.partnerFinal}`);
            console.log(`Current Points: ${pair.points}`);
            console.log('---------------------------');
        }

        console.log('\n--- PENDING SUBMISSIONS ---');
        console.log(JSON.stringify(program.pendingSubmissions, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

dumpActiveProgram();
