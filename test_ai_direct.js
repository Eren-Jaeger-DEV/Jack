const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testAI() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log("AI Response:", response.text());
    } catch (err) {
        console.error("AI Test Error:", err);
    }
}

testAI();
