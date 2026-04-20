const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const fosterService = require('../plugins/foster-program/services/fosterService');

const CYCLE_1_RESULTS = [
    { name: '〜KennY', id: '1415693094397153444', role: 'MENTOR', points: 331 },
    { name: 'TomPlayzzYT', id: '1281919262591811597', role: 'PARTNER', points: 331 },
    { name: '〜Kezzo', id: '1270985058118926338', role: 'MENTOR', points: 402 },
    { name: 'EVIL〆StONeROP', id: '1035525922603937814', role: 'PARTNER', points: 402 },
    { name: 'ASURxTEERTH20', id: '884290995947192360', role: 'MENTOR', points: 84 },
    { name: 'IGL父JINRANG', id: '1207631055436255282', role: 'PARTNER', points: 84 }
];

async function syncFosterLeaderboard() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const program = await FosterProgram.findOne({ active: true });
        if (!program) {
            console.error('No active Foster Program found!');
            return;
        }

        console.log(`\n--- Syncing Foster-Specific Points (T${program.term} C${program.cycle}) ---`);

        // Update the internal maps
        for (const res of CYCLE_1_RESULTS) {
            if (res.role === 'MENTOR') {
                program.mentorPoints.set(res.id, res.points);
            } else {
                program.partnerPoints.set(res.id, res.points);
            }
            console.log(`✅ Set Foster Points for ${res.name}: ${res.points}`);
        }

        await program.save();
        console.log('\nFoster Program document updated.');

        await mongoose.disconnect();
        console.log('\nSync Complete. (Please use the restart command to refresh the board on Discord)');
    } catch (error) {
        console.error('Error:', error);
    }
}

syncFosterLeaderboard();
