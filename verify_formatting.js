const aiController = require("./core/aiController");

const testCases = [
    {
        name: "Pure JSON Response",
        raw: '{"intent": "chat", "type": "response", "text": "Hello, how can I help you today?"}',
        expected: "Hello, how can I help you today?"
    },
    {
        name: "Mixed Text and JSON",
        raw: 'I have analyzed the data: {"text": "The player is online."}',
        expected: "The player is online."
    },
    {
        name: "Malformed JSON / Partial",
        raw: '{"text": "Incomplete response...',
        expected: 'Incomplete response...'
    },
    {
        name: "Standard Text",
        raw: "I am Jack, your strategist.",
        expected: "I am Jack, your strategist."
    }
];

testCases.forEach(tc => {
    const output = aiController._extractFinalText(tc.raw);
    console.log(`[${tc.name}]`);
    console.log(`  Input: ${tc.raw}`);
    console.log(`  Output: ${output}`);
    console.log(`  Status: ${output === tc.expected ? "PASS" : "FAIL"}`);
});
