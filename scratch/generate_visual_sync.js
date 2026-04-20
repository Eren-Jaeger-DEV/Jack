const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
const Player = require('../bot/database/models/Player');
const aiService = require('../bot/utils/aiService');
const logger = require('../utils/logger');

const TOKEN = process.env.BOT_TOKEN;
const THREAD_ID = '1493681758812508170';

async function generateVisualSyncDraft() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const program = await FosterProgram.findOne({ active: true });
        if (!program) return console.log('No active program.');

        console.log(`Analyzing thread history via AI Vision: ${THREAD_ID}\n`);

        const response = await axios.get(`https://discord.com/api/v10/channels/${THREAD_ID}/messages?limit=100`, {
            headers: { Authorization: `Bot ${TOKEN}` }
        });
        const messages = response.data.reverse();

        const dataPool = {}; // userId -> { initial: {points, selection}, final: {points, selection} }

        for (const msg of messages) {
            const userId = msg.author.id;
            const content = msg.content.toLowerCase();
            const attachment = msg.attachments?.[0]?.url;

            if (!attachment) continue;

            let type = content.includes('final') ? 'final' : 'initial'; // Default to initial if not specified
            
            console.log(`Scanning image from ${msg.author.username} (${type})...`);
            const aiResult = await aiService.extractSynergyPoints(attachment);
            
            if (aiResult && aiResult.points > 0) {
                if (!dataPool[userId]) dataPool[userId] = {};
                dataPool[userId][type] = aiResult;
                console.log(`  > Found: ${aiResult.points} points (${aiResult.selection})`);
            } else {
                console.log(`  > Could not read image.`);
            }
        }

        console.log('\n=== RECALCULATION DRAFT (AI VERIFIED) ===\n');
        
        const syncResults = [];

        for (const pair of program.pairs) {
            const m = await Player.findOne({ discordId: pair.mentorId });
            const p = await Player.findOne({ discordId: pair.partnerId });
            
            const mData = dataPool[pair.mentorId] || {};
            const pData = dataPool[pair.partnerId] || {};

            const mInitial = mData.initial?.points || 0;
            const pInitial = pData.initial?.points || 0;
            const mFinal = mData.final?.points || 0;
            const pFinal = pData.final?.points || 0;

            const mGrowth = Math.max(0, mFinal - mInitial);
            const pGrowth = Math.max(0, pFinal - pInitial);
            const totalGrowth = mGrowth + pGrowth;
            const split = totalGrowth / 2;

            syncResults.push({
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
            console.log(`  Initial Points: [Mentor: ${mInitial}, Partner: ${pInitial}]`);
            console.log(`  Final Points:   [Mentor: ${mFinal}, Partner: ${pFinal}]`);
            if (mFinal > 0 || pFinal > 0) {
                console.log(`  Growth:         [Mentor: ${mGrowth}, Partner: ${pGrowth}] | Total: ${totalGrowth}`);
                console.log(`  New Award:      ${split} each`);
            } else {
                console.log(`  Status:         Pending Final Verification`);
            }
            console.log('-------------------------------------------\n');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

generateVisualSyncDraft();
