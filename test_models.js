const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function list() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // The SDK might not have a direct listModels, we might need to use fetch or a different approach
        // if it's not exposed. Let's try to just test with 'gemini-1.5-flash' first.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-1.5-flash");
    } catch (err) {
        console.error("Failed with gemini-1.5-flash:", err.message);
        
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("test");
            console.log("Success with gemini-pro");
        } catch (err2) {
            console.error("Failed with gemini-pro:", err2.message);
        }
    }
}

list();
