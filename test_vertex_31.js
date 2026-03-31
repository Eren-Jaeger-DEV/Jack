const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// We'll try to use the ADC (local login) if API key isn't provided.
// On GCP, the @google/genai SDK can often pick up the environment credentials.
const apiKey = process.env.GOOGLE_CLOUD_API_KEY || ""; 

const ai = new GoogleGenAI({
  apiKey: apiKey,
});

const model = 'gemini-3.1-pro-preview';

async function test() {
  console.log("--- High-Performance Gemini 3.1 Test ---");
  console.log(`Model: ${model}`);
  
  try {
    const chat = ai.chats.create({
      model: model,
      config: {
        thinkingConfig: { thinkingLevel: "HIGH" },
        maxOutputTokens: 2048, // Limit for test
      }
    });

    console.log("Jack is starting to think...");
    const response = await chat.sendMessageStream({
      message: [{ text: "Write a short tournament strategy for a 4-man BGMI team." }]
    });

    process.stdout.write('Response: ');
    for await (const chunk of response) {
      if (chunk.text) {
        process.stdout.write(chunk.text);
      }
    }
    console.log("\n\n--- Test SUCCESSFUL! ---");
  } catch (err) {
    console.error("\n--- Gemini 3.1 Test FAILED ---");
    console.error(err.message);
    if (err.message.includes("API key")) {
        console.log("💡 Tip: You might need to provide the 'GOOGLE_CLOUD_API_KEY' in your .env");
    }
  }
}

test();
