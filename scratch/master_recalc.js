const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const Player = require('../bot/database/models/Player');
const aiService = require('../bot/utils/aiService');

const TOKEN = process.env.BOT_TOKEN;
const THREADS = [
    '1493044829826056212', // Final Stats T1 C1
    '1493226162967810199', // Verification T1 C2 (Initial)
    '1493681758812508170'  // Current thread
];

async function masterRecalculation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const program = await FosterProgram.findOne({ active: true });
        if (!program) return console.log('No active program.');

        const dataPool = {}; // userId -> { cycle1_final: points, cycle2_initial: points }

        for (const threadId of THREADS) {
            console.log(`\nFetching thread: ${threadId}`);
            const response = await axios.get(`https://discord.com/api/v10/channels/${threadId}/messages?limit=100`, {
                headers: { Authorization: `Bot ${TOKEN}` }
            });
            const messages = response.data.reverse();

            for (const msg of messages) {
                const userId = msg.author.id;
                const content = msg.content.toLowerCase();
                const attachment = msg.attachments?.[0]?.url;

                if (!attachment) continue;

                // Simple regex to find points in text if AI fails or to speed up
                const pointsMatch = content.match(/(\d+)/);
                const points = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;

                if (!dataPool[userId]) dataPool[userId] = {};
                
                if (threadId === '1493044829826056212') dataPool[userId].c1_final = points;
                if (threadId === '1493226162967810199') dataPool[userId].c2_initial = points;
                if (threadId === '1493681758812508170') {
                    if (content.includes('final')) dataPool[userId].c2_final = points;
                    else dataPool[userId].c2_initial = points;
                }
            }
        }

        console.log('\n=== DRAFT RECALCULATION REPORT ===\n');
        
        for (const pair of program.pairs) {
            const m = await Player.findOne({ discordId: pair.mentorId });
            const p = await Player.findOne({ discordId: pair.partnerId });
            
            const mData = dataPool[pair.mentorId] || {};
            const pData = dataPool[pair.partnerId] || {};

            console.log(`Pair: ${m?.ign || pair.mentorId} & ${p?.ign || pair.partnerId}`);
            
            // Cycle 2 Calculation
            const mInit = mData.c2_initial || 0;
            const pInit = pData.c2_initial || 0;
            const mFinal = mData.c2_final || 0;
            const pFinal = pData.c2_final || 0;

            const mGrowth = Math.max(0, mFinal - mInit);
            const pGrowth = Math.max(0, pFinal - pInit);
            const totalGrowth = mGrowth + pGrowth;
            const split = totalGrowth / 2;

            console.log(`  Cycle 2 Initial: [M: ${mInit}, P: ${pInit}]`);
            console.log(`  Cycle 2 Final:   [M: ${mFinal}, P: ${pFinal}]`);
            console.log(`  Result: Total Growth ${totalGrowth} -> ${split} points each.\n`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

masterRecalculation();
