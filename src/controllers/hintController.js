const model = require("../config/gemini");
const redisClient = require("../config/redis");
const Problem = require("../models/problem"); 
const mongoose = require("mongoose"); // ObjectId conversion ke liye
const getCustomHint = async (req, res) => {
    try {
        const { problemId } = req.body;

        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ message: "Problem nahi mili!" });

        // 1. Check Redis
        const cachedHint = await redisClient.get(`hint:${problemId}`);
        if (cachedHint) return res.status(200).json({ hint: cachedHint, source: "cache" });

        // 2. Stronger Prompt
        const prompt = `You are a coding tutor. Give a tiny 2-line logic hint for "${problem.title}".
Instructions:
- Write in a single plain paragraph.
- Use simple Hinglish.
- Strictly NO bullet points, NO lists, NO special characters like stars or dashes.
- End the hint with a proper full stop.
- No code.`;

        // 3. API Call with explicit config
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 500, 
                temperature: 0.7, // Thodi stability ke liye
            },
        });

        const text = result.response.text().trim();
        const looksDecent = text.length > 40;
        let finalHint = text;
        if (!/[.!?]$/.test(text)) {
            finalHint += "."; // Apne aap full stop laga do agar AI bhool gaya
        }

        if (text && looksDecent) {
            // Agar text decent length ka hai toh cache kar lo
            await redisClient.setEx(`hint:${problemId}`, 86400, finalHint);
            return res.status(200).json({ hint: finalHint, source: "api" });
        } else {
            return res.status(200).json({ 
                hint: text, 
                message: "Kuch gadbad hui, fir se try karein.",
                source: "api_incomplete" 
            });
        }

        // 4. VALIDATION: Check if hint is complete
        // Agar hint "." ya "!" par khatam nahi ho raha, toh ye adhura ho sakta hai
        const isComplete = text.endsWith('.') || text.endsWith('!') || text.endsWith('?');

        if (text && text.length > 20 && isComplete) {
            // Sirf tabhi cache karo jab hint bada aur complete ho
            await redisClient.setEx(`hint:${problemId}`, 86400, text);
            return res.status(200).json({ hint: text, source: "api" });
        } else {
            // Agar adhura hai toh cache mat karo, user ko bolo try again
            return res.status(200).json({ 
                hint: text + "... (Hint adhura lag raha hai, please try again!)", 
                source: "api_incomplete" 
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getCustomHint };