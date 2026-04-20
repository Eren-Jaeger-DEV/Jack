const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const TOKEN = process.env.BOT_TOKEN;
const THREAD_ID = '1493681758812508170'; // From the raw dump

async function fetchThreadHistory() {
    try {
        console.log(`Fetching history for thread: ${THREAD_ID}`);
        const response = await axios.get(`https://discord.com/api/v10/channels/${THREAD_ID}/messages`, {
            headers: { Authorization: `Bot ${TOKEN}` }
        });

        const messages = response.data;
        console.log(`Found ${messages.length} messages.\n`);

        for (const msg of messages) {
            console.log(`[${msg.timestamp}] ${msg.author.username} (${msg.author.id}):`);
            console.log(`Content: ${msg.content}`);
            if (msg.attachments && msg.attachments.length > 0) {
                console.log(`Attachments: ${msg.attachments.map(a => a.url).join(', ')}`);
            }
            console.log('---------------------------');
        }
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

fetchThreadHistory();
