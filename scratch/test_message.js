const { Client, GatewayIntentBits } = require('discord.js');
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
        send: async (data) => console.log('BOT REPLY:', data),
        sendTyping: async () => console.log('BOT IS TYPING...')
    },
    member: { 
        id: '771611262022844427',
        permissions: { has: () => true }
    },
    reply: async (data) => console.log('BOT REPLY:', data)
};

console.log('--- STARTING MANUAL EVENT TEST ---');
messageCreate.execute(mockMessage, client)
    .then(() => console.log('--- TEST COMPLETE ---'))
    .catch(err => console.error('--- TEST FAILED ---', err));
