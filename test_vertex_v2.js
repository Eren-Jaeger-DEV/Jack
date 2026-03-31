const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const project = process.env.GOOGLE_PROJECT_ID || 'jack-489112';
const location = process.env.GOOGLE_LOCATION || 'asia-southeast1';
const vertex_ai = new VertexAI({ project: project, location: location });

// This matches the exact model from your "GET CODE" window
const generativeModel = vertex_ai.getGenerativeModel({
  model: 'gemini-1.5-flash-001',
});

async function test() {
  console.log("--- Gemini 3.1 Pro Connection Test ---");
  console.log(`Project: ${project}`);
  console.log(`Location: ${location}`);
  
  try {
    const request = {
      contents: [{ role: 'user', parts: [{ text: 'Respond with "Jack is online!"' }] }]
    };
    const resp = await generativeModel.generateContent(request);
    console.log("Response Received! ->", resp.response.candidates[0].content.parts[0].text);
  } catch (err) {
    console.error("Gemini 3.1 Test FAILED:", err.message);
  }
}

test();
