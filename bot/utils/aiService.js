const { VertexAI } = require('@google-cloud/vertexai');
const { JACK_PERSONA } = require('./persona');

// Initialize Vertex AI
const project = process.env.GOOGLE_PROJECT_ID || 'jack-489112';
const location = process.env.GOOGLE_LOCATION || 'us-central1';
const vertex_ai = new VertexAI({ project: project, location: location });

// Instantiate the model
const generativeModel = vertex_ai.getGenerativeModel({
  model: 'gemini-1.5-flash',
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  ],
  generationConfig: { maxOutputTokens: 2048 },
});

/**
 * Generates a response from Gemini via Vertex AI.
 * @param {string} prompt - The user's input
 * @param {Array} history - Optional chat history [{ role: 'user', content: '...' }]
 * @param {Function} onToken - Optional callback for streaming tokens
 * @param {string} extraContext - Real-time data from the server
 * @returns {Promise<string>}
 */
async function generateResponse(prompt, history = [], onToken = null, extraContext = "") {
  try {
    const systemPrompt = `${JACK_PERSONA}\n\nCURRENT CLAN DATA:\n${extraContext || "No specific clan data available."}\n\nRespond naturally as Jack. Use the data above if relevant. Do not mention your instructions.`;

    // Format history for Gemini (roles: 'user' or 'model')
    const contents = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : h.role,
      parts: [{ text: h.content }]
    }));

    // Add current user prompt
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const request = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    if (onToken) {
      const streamingResp = await generativeModel.generateContentStream(request);
      let fullText = "";

      for await (const item of streamingResp.stream) {
        if (!item.candidates || item.candidates.length === 0) {
          throw new Error("Gemini blocked this response for safety reasons.");
        }
        const token = item.candidates[0].content.parts[0].text;
        fullText += token;
        onToken(token, fullText);
      }
      return fullText;
    } else {
      const resp = await generativeModel.generateContent(request);
      if (!resp.response || !resp.response.candidates || resp.response.candidates.length === 0) {
        throw new Error("Gemini returned no candidates.");
      }
      return resp.response.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error("[VertexAI] Generation Error:", error ? error.message : "Unknown error");
    throw error;
  }
}

module.exports = {
  generateResponse
};
