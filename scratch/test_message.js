const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();
const messageCreate = require('../bot/events/messageCreate');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Mock message object
const mockMessage = {
    content: 'j setup',
    author: { bot: false, tag: 'TestUser#0001', id: '771611262022844427' },
    guild: { name: 'JACK • XZEEMO', id: '1341978655437619250' },
    channel: { 
        id: '1341978656096129065',
        send: async (data) => console.log('BOT REPLY:', JSON.stringify(data, null, 2)),
        sendTyping: async () => console.log('BOT IS TYPING...')
    },
    member: { 
        id: '771611262022844427',
        permissions: { has: () => true }
    },
    reply: async (data) => console.log('BOT REPLY:', JSON.stringify(data, null, 2))
};

async function run() {
    console.log('--- CONNECTING TO DB ---');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- DB CONNECTED ---');

    console.log('--- STARTING MANUAL EVENT TEST ---');
    await messageCreate.execute(mockMessage, client);
    console.log('--- TEST COMPLETE ---');
    process.exit(0);
}

run().catch(err => {
    console.error('--- TEST FAILED ---', err);
    process.exit(1);
});
