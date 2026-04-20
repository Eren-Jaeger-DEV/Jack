const aiService = require('../bot/utils/aiService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const testUrl = 'https://cdn.discordapp.com/attachments/1493681758812508170/1493831632338161716/Screenshot_20260415-100024.png?ex=69e45b1f&is=69e3099f&hm=d2e9943f3d978456b75b99ca58d265bdccf62f8fadf28308775812f789649cd2';

async function testAI() {
    console.log('Testing AI with URL:', testUrl);
    const result = await aiService.extractSynergyPoints(testUrl);
    console.log('\nAI RESULT:', JSON.stringify(result, null, 2));
}

testAI();
