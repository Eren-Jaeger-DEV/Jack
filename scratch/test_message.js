const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();
const messageCreate = require('../bot/events/messageCreate');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load the setup command into the mock client
const setupCommand = require('../plugins/infrastructure/commands/setupctrlpanel');
client.commands.set(setupCommand.name, setupCommand);

// Mock message object
const mockMessage = {
    content: 'j setup',
    author: { bot: false, tag: 'TestUser#0001', id: '771611262022844427' },
    guild: { 
        name: 'JACK • XZEEMO', 
        id: '1341978655437619250',
        members: { me: { permissions: { has: () => true } } }
    },
    channel: { 
        id: '1341978656096129065',
        send: async (data) => console.log('BOT REPLY:', JSON.stringify(data, null, 2)),
        sendTyping: async () => console.log('BOT IS TYPING...'),
        messages: { fetch: async () => null }
    },
    member: { 
        id: '771611262022844427',
        permissions: { has: () => true },
        guild: { id: '1341978655437619250' }
    },
    mentions: { 
        users: new Map(),
        has: () => false
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
