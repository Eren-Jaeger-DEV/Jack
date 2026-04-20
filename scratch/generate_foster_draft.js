const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const Player = require('../bot/database/models/Player');
const aiService = require('../bot/utils/aiService');

const TOKEN = process.env.BOT_TOKEN;

async function generateSyncDraft() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const program = await FosterProgram.findOne({ active: true });
        if (!program) return console.log('No active program.');

        const threadId = program.submissionThreadId;
        console.log(`Analyzing thread: ${threadId}\n`);

        const response = await axios.get(`https://discord.com/api/v10/channels/${threadId}/messages?limit=100`, {
            headers: { Authorization: `Bot ${TOKEN}` }
        });
        const messages = response.data.reverse(); // Chronological order

        const submissions = {}; // userId -> { initial: {points, url}, final: {points, url} }

        for (const msg of messages) {
            const userId = msg.author.id;
            const content = msg.content.toLowerCase();
            const attachment = msg.attachments?.[0]?.url;

            if (!attachment) continue;

            let type = null;
            if (content.includes('initial')) type = 'initial';
            else if (content.includes('final')) type = 'final';

            if (!type) continue;

            // Try to extract points from text
            const pointsMatch = content.match(/(\d+)/);
            const points = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;

            if (!submissions[userId]) submissions[userId] = {};
            submissions[userId][type] = { points, url: attachment };
        }

        console.log('=== FOSTER PROGRAM RECALCULATION DRAFT ===\n');
        
        const syncData = [];

        for (const pair of program.pairs) {
            const m = await Player.findOne({ discordId: pair.mentorId });
            const p = await Player.findOne({ discordId: pair.partnerId });
            
            const mSub = submissions[pair.mentorId] || {};
            const pSub = submissions[pair.partnerId] || {};

            const mInitial = mSub.initial?.points || 0;
            const pInitial = pSub.initial?.points || 0;
            const mFinal = mSub.final?.points || 0;
            const pFinal = pSub.final?.points || 0;

            const mGrowth = Math.max(0, mFinal - mInitial);
            const pGrowth = Math.max(0, pFinal - pInitial);
            const totalGrowth = mGrowth + pGrowth;
            const split = totalGrowth / 2;

            syncData.push({
                mentor: m?.ign || pair.mentorId,
                partner: p?.ign || pair.partnerId,
                mentorId: pair.mentorId,
                partnerId: pair.partnerId,
                initial: { mentor: mInitial, partner: pInitial },
                final: { mentor: mFinal, partner: pFinal },
                growth: { mentor: mGrowth, partner: pGrowth },
                totalGrowth,
                split
            });

            console.log(`Pair: ${m?.ign || 'Unknown'} & ${p?.ign || 'Unknown'}`);
            console.log(`  Initial: [M: ${mInitial}, P: ${pInitial}]`);
            console.log(`  Final:   [M: ${mFinal}, P: ${pFinal}]`);
            console.log(`  Growth:  [M: ${mGrowth}, P: ${pGrowth}] | Total: ${totalGrowth}`);
            console.log(`  Awarded: ${split} each\n`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

generateSyncDraft();
