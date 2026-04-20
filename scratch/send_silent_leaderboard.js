const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Player = require('../bot/database/models/Player');
const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = '1477150817021858047';

async function sendSilentLeaderboard() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const topPlayers = await Player.find({ seasonSynergy: { $gt: 0 } })
            .sort({ seasonSynergy: -1 })
            .limit(10);

        let description = '📊 **Current Season Synergy Standings**\n\n';
        topPlayers.forEach((p, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
            description += `${medal} **${p.ign || 'Unknown'}** — \`${p.seasonSynergy}\` pts\n`;
        });

        const embed = {
            title: '🏆 FOSTER PROGRAM LEADERBOARD',
            description: description,
            color: 0x00FFCC,
            timestamp: new Date(),
            footer: { text: 'Silent Refresh Logged | Operation: Supreme Manager' }
        };

        await axios.post(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
            embeds: [embed],
            allowed_mentions: { parse: [] } // No pings
        }, {
            headers: { Authorization: `Bot ${TOKEN}` }
        });

        console.log('Silent leaderboard sent.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

sendSilentLeaderboard();
