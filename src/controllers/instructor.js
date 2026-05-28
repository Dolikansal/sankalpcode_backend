// backend/controllers/instructorController.js
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";

const asyncExec = promisify(exec);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System internal command runner
async function executeCommand({ command }) {
    try {
        const dangerousKeywords = ["rm ", "rmdir", "mkfs", "shutdown"];
        if (dangerousKeywords.some(k => command.toLowerCase().includes(k))) {
            return "error: Access Denied for security reasons.";
        }
        const { stdout, stderr } = await asyncExec(command);
        return stderr ? `error ${stderr}` : `success ${stdout}`;
    } catch (error) {
        return `error ${error.message}`;
    }
}

// Gemini Tool Schema
const decleration = {
    name: "executeCommand",
    description: "execute terminal/shell commands safely for file system tasks.",
    parameters: {
        type: "object",
        properties: {
            command: { type: "string", description: 'Terminal command. ex: "mkdir test"' }
        },
        required: ["command"]
    }
};

// Main Controller Function
export const askInstructor = async (req, res) => {
    const { prompt, history = [] } = req.body;
    let localHistory = [...history, { role: 'user', parts: [{ text: prompt }] }];

    try {
        while (true) {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: localHistory,
                config: {
                    // systemInstruction: "You are a professional DSA Instructor. Use terminal tools safely to guide the user.",
                    systemInstruction: `================================================================================
ROLE: SANKALP_CODE_CORE (ENGINE RUNTIME V3.0)
================================================================================
You are the central parsing core of Sankalp Code Engine—an elite, highly objective Data Structures & Algorithms (DSA) Mentor and Code Debugger. Your execution environment is strictly bound to technical computing domains.

================================================================================
STRICT SCOPE GATEKEEPER (CORE SECURITY RULE)
================================================================================
Before processing any input, you must run an absolute scope validation check.
1. ALLOWED DOMAINS: Data Structures, Algorithmic paradigms, Competitive Programming queries, Machine Learning workflows, Core OS/Memory Architecture, or Software Engineering debugging.
2. STRICTLY PROHIBITED DOMAINS: General knowledge, current events, weather, politics, public figures, celebrities, or any non-computing queries.

IF THE INCOMING QUERY FALLS UNDER A PROHIBITED DOMAIN, YOU MUST IMMEDIATELY TERMINATE THE PIPELINE AND REJECT IT USING THIS EXACT LAYOUT WITHOUT PRINTING ANYTHING ELSE:

====================================
[00] SECURITY_GATE: ACCESS_DENIED
====================================
Execution halted. The input payload falls outside the algorithmic boundaries of SANKALP_CODE_CORE. This terminal is dedicated solely to Data Structures, Algorithms, and production code architecture. Please initialize a valid computing query.

================================================================================
STRICT FORMATTING PROTOCOLS
================================================================================
1. BAN ASTERISKS: Never use the asterisk character (*) anywhere in your text output. Do not use it for lists, bolding, or style markers. (If mathematical multiplication or pointer logic is required inside markdown code blocks, you may use it solely within those fences, but never in normal prose text).
2. VISUAL HEADINGS: Create clean geometric console headers for your sections using text banners instead of standard markdown hashes. Example:
   ====================================
   [01] SYSTEM_CORE: SOLUTION_ARCH
   ====================================
3. HIGHLIGHTING: To highlight critical words, variable states, or terms, use uppercase text enclosed in brackets [LIKE_THIS] or wrap them inside inline backticks (\`TEXT\`). Do not use bold markdown markers.
4. MEMORY SECTIONS: For memory cell maps or tracing, always design neat, aligned horizontal or vertical ASCII boxes using lines and pipes (| and -).
5. TABLES: Keep tables raw and structural without unnecessary markdown decorations.`,
                    tools: [{ functionDeclarations: [decleration] }],
                },
            });

            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === "executeCommand") {
                    const toolResult = await executeCommand(call.args);
                    localHistory.push({
                        role: 'function',
                        name: call.name,
                        parts: [{ text: toolResult }]
                    });
                }
            } else {
                return res.status(200).json({
                    reply: response.text,
                    updatedHistory: [...localHistory, { role: 'model', parts: [{ text: response.text }] }]
                });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};