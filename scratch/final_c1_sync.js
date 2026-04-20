const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Player = require('../bot/database/models/Player');
const FosterProgram = require('../plugins/foster-program/models/FosterProgram');

const CYCLE_1_RESULTS = [
    { name: '〜KennY', id: '1415693094397153444', points: 331 },
    { name: 'TomPlayzzYT', id: '1281919262591811597', points: 331 },
    { name: '〜Kezzo', id: '1270985058118926338', points: 402 },
    { name: 'EVIL〆StONeROP', id: '1035525922603937814', points: 402 },
    { name: 'ASURxTEERTH20', id: '884290995947192360', points: 84 },
    { name: 'IGL父JINRANG', id: '1207631055436255282', points: 84 }
];

async function syncCycle1() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- Syncing Cycle 1 Points ---');
        
        for (const res of CYCLE_1_RESULTS) {
            const player = await Player.findOne({ discordId: res.id });
            if (player) {
                player.seasonSynergy = (player.seasonSynergy || 0) + res.points;
                player.weeklySynergy = (player.weeklySynergy || 0) + res.points;
                await player.save();
                console.log(`✅ Updated ${res.name}: +${res.points} points. (New Total: ${player.seasonSynergy})`);
            } else {
                console.warn(`⚠️ Player not found: ${res.name} (${res.id})`);
            }
        }

        // Also update the FosterProgram document (History)
        const program = await FosterProgram.findOne({ active: true });
        if (program) {
            // We'll just log this in the console for now as C1 is "historical"
            console.log('\nGlobal Leaderboard updated. Active program remains on Cycle 2.');
        }

        await mongoose.disconnect();
        console.log('\nSync Complete.');
    } catch (error) {
        console.error('Error:', error);
    }
}

syncCycle1();
