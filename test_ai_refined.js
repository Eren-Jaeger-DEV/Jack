const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testAI() {
    const key = process.env.GEMINI_API_KEY.trim();
    console.log("Using API Key (first 5):", key.substring(0, 5));
    
    const genAI = new GoogleGenerativeAI(key);
    
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ];

    for (const m of modelsToTry) {
        console.log(`Testing model: ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log(`✅ Success with ${m}:`, response.text().substring(0, 50));
            return;
        } catch (err) {
            console.error(`❌ Failed with ${m}:`, err.message);
        }
    }
}

testAI();
