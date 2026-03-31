require('dotenv').config();
const aiService = require('./bot/utils/aiService');

async function testStreaming() {
    console.log("🚀 Testing Local Ollama Streaming (phi)...");
    
    let lastLength = 0;
    try {
        const fullResponse = await aiService.generateResponse(
            "Write a short 3-sentence story about a robot named Jack.",
            [],
            (token, fullText) => {
                // Print only the new part of the stream
                process.stdout.write(token);
                lastLength = fullText.length;
            }
        );

        console.log("\n\n✅ Stream Finished!");
        console.log("Full length:", fullResponse.length);
        
    } catch (err) {
        console.error("\n❌ Streaming Error:", err.message);
    }
}

testStreaming();
