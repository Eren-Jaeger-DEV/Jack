const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_CLOUD_API_KEY}`);
        const data = await response.json();
        console.log('Available Models:', JSON.stringify(data.models?.map(m => m.name), null, 2));
    } catch (e) {
        console.error('Error listing models:', e.message);
    }
}

listModels();
