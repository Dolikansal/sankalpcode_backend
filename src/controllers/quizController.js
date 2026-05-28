const model = require("../config/gemini");
const Problem = require("../models/problem");
const redisclient = require("../config/redis");

const generateMockQuiz = async (req, res) => {
    try {
        const { problemId, userCode } = req.body;

        // 1. Check if Quiz is already in Redis (Quota bachane ke liye)
        const cacheKey = `quiz:${problemId}:${Buffer.from(userCode).toString('base64').substring(0, 10)}`;
        const cachedQuiz = await redisclient.get(cacheKey);
        if (cachedQuiz) {
            return res.status(200).json({ ...JSON.parse(cachedQuiz), source: "cache" });
        }

        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ message: "Problem nahi mili" });

        const prompt = `Analyze user code for '${problem.title}': ${userCode}. 
        Generate 1 Hinglish MCQ based on their approach. 
        Return ONLY JSON: {"question": "", "options": [], "answer": "", "explanation": ""}`;

        const result = await model.generateContent(prompt);
        const quizData = JSON.parse(result.response.text());

        // 2. Save to Redis for 24 hours
        await redisclient.setEx(cacheKey, 86400, JSON.stringify(quizData));

        res.status(200).json({ ...quizData, source: "api" });

    } catch (error) {
        if (error.message.includes("429")) {
            return res.status(429).json({ message: "Gemini 2.5 ka quota khatam ho gaya hai. Kal try karein ya Model badlein." });
        }
        res.status(500).json({ message: "Error", error: error.message });
    }
};

module.exports = { generateMockQuiz };