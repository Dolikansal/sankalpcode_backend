const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini API Key environment variables se lo
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", // Flash fast hai aur hints ke liye perfect hai
    generationConfig: { maxOutputTokens:1000 ,temperature: 0.7 ,responseMimeType: "application/json"} 
});

module.exports = model;