require('dotenv').config();
const aiService = require('./bot/utils/aiService');

async function testOllama() {
  console.log("🚀 Testing Ollama Integration...");
  console.log(`📡 URL: ${process.env.OLLAMA_URL || "http://localhost:11434"}`);
  console.log(`🤖 Model: ${process.env.OLLAMA_MODEL || "phi"}`);
  
  try {
    const response = await aiService.generateResponse("Hello Jack, what is your purpose?");
    console.log("\n--- Ollama Response ---");
    console.log(response);
    console.log("-----------------------\n");
    
    if (response.includes("❌") || response.includes("⚠️")) {
      console.log("Result: AI returned an error/warning (check if Ollama is running).");
    } else {
      console.log("Result: SUCCESS! Ollama is connected and responding.");
    }
  } catch (err) {
    console.error("Test Script Error:", err.message);
  }
}

testOllama();
