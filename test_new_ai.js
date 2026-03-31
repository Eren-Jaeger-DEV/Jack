require('dotenv').config();
const aiService = require('./bot/utils/aiService');

async function test() {
    console.log("Testing AI Service with new model...");
    try {
        const response = await aiService.generateResponse("Hello Jack, can you hear me?");
        console.log("\n--- AI Response ---");
        console.log(response);
        console.log("-------------------\n");
        
        if (response.includes("⚠️") || response.includes("❌")) {
            console.log("Result: AI returned an error/warning (likely quota or config).");
        } else {
            console.log("Result: SUCCESS!");
        }
    } catch (err) {
        console.error("Test Script Error:", err);
    }
}

test();
