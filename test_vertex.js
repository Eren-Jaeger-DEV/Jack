const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const project = process.env.GOOGLE_PROJECT_ID || 'jack-489112';
const location = process.env.GOOGLE_LOCATION || 'us-central1';
const vertex_ai = new VertexAI({ project: project, location: location });

const generativeModel = vertex_ai.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

async function test() {
  console.log("--- Vertex AI Connectivity Test ---");
  console.log(`Project: ${project}`);
  console.log(`Location: ${location}`);
  
  try {
    const request = {
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you there?' }] }]
    };
    const resp = await generativeModel.generateContent(request);
    console.log("Response Received! ->", resp.response.candidates[0].content.parts[0].text);
  } catch (err) {
    console.error("Vertex AI Test FAILED:", err.message);
  }
}

test();
