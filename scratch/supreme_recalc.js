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
    '1493226162967810199', // Verification T1 C2 (Initial)
    '1493681758812508170'  // Current thread
];

async function supremeRecalculation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const program = await FosterProgram.findOne({ active: true });
        if (!program) return console.log('No active program.');

        const results = {}; // userId -> { initial: {points, selection}, final: {points, selection} }

        for (const threadId of THREADS) {
            console.log(`\n🚀 SCANNING THREAD: ${threadId}`);
            const response = await axios.get(`https://discord.com/api/v10/channels/${threadId}/messages?limit=100`, {
                headers: { Authorization: `Bot ${TOKEN}` }
            });
            const messages = response.data.reverse();

            for (const msg of messages) {
                const userId = msg.author.id;
                const attachment = msg.attachments?.[0]?.url;
                const content = msg.content.toLowerCase();

                if (!attachment) continue;

                let type = content.includes('final') ? 'final' : 'initial';
                
                process.stdout.write(`  Scanning image from ${msg.author.username}... `);
                const aiResult = await aiService.extractSynergyPoints(attachment);
                
                if (aiResult) {
                    if (!results[userId]) results[userId] = {};
                    results[userId][type] = aiResult;
                    console.log(`✅ [${aiResult.points} pts | ${aiResult.selection}]`);
                } else {
                    console.log(`❌ (Read Failed)`);
                }
            }
        }

        console.log('\n\n================================================');
        console.log('🛡️  FOSTER PROGRAM SUPREME SYNC DRAFT');
        console.log('================================================\n');

        const finalSync = [];

        for (const pair of program.pairs) {
            const m = await Player.findOne({ discordId: pair.mentorId });
            const p = await Player.findOne({ discordId: pair.partnerId });
            
            const mData = results[pair.mentorId] || {};
            const pData = results[pair.partnerId] || {};

            const mInit = mData.initial?.points || 0;
            const pInit = pData.initial?.points || 0;
            const mFinal = mData.final?.points || 0;
            const pFinal = pData.final?.points || 0;

            const mGrowth = Math.max(0, mFinal - mInit);
            const pGrowth = Math.max(0, pFinal - pInit);
            const totalGrowth = mGrowth + pGrowth;
            const split = totalGrowth / 2;

            console.log(`💎 Pair: ${m?.ign || pair.mentorId} & ${p?.ign || pair.partnerId}`);
            console.log(`   Initial: ${mInit} (${mData.initial?.selection || '?'}) / ${pInit} (${pData.initial?.selection || '?'})`);
            console.log(`   Final:   ${mFinal} (${mData.final?.selection || '?'}) / ${pFinal} (${pData.final?.selection || '?'})`);
            
            if (mFinal > 0 || pFinal > 0) {
                console.log(`   ✨ POOLED GROWTH: ${totalGrowth} -> +${split} points each.`);
            } else {
                console.log(`   ⏳ STATUS: Waiting for Final Stats.`);
            }
            console.log('------------------------------------------------\n');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

supremeRecalculation();
