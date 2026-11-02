const problemmodel = require('../models/problem');
const submission = require('../models/submission');
const user = require('../models/user');
const Room = require('../models/battle');
const {getlanguagebyid , submitbatch ,submittoken} = require('../utils/problemutility');
const { getRoom, updateRoom, removeRoom } = require('../utils/battleroom');
const submitcode = async(req , res)=>{
    try{
        const userid = req.result._id;
        const problemid = req.params.id;

        const {code, language, isBattle, roomCode} = req.body; // 👈 roomCode aur isBattle destructure kiya

        if(!userid || !problemid || !code || !language){
            return res.status(400).json({message: "Missing required fields"});
        }

        const foundProblem = await problemmodel.findById(problemid);
        if (!foundProblem) {
            return res.status(404).json({ message: "Problem not found" });
        }
        const submissionresult = await submission.create({
            userid,
            problemid,
            code,
            language,
            status: 'pending',
            hiddencasetotal : foundProblem.hiddentestcase.length
        })

        const languageid = getlanguagebyid(language);
        console.log("Debug - Language Name:", language, "ID Found:", languageid);
        if (!languageid) {
            return res.status(400).json({ message: "Invalid Language selected" });
        }
        const submissions = foundProblem.hiddentestcase.map((testcase) => ({
            source_code: Buffer.from(code).toString('base64'),
            language_id: languageid,
            stdin: Buffer.from(testcase.input).toString('base64'),
            expected_output: Buffer.from(testcase.output).toString('base64')
        }));
        const submitresult = await submitbatch(submissions , { base64: true });
        if (!submitresult || submitresult.length === 0) {
            throw new Error("Failed to get tokens from Judge0");
        }
        const resulttoken = submitresult.map((tokens)=>{
            return tokens.token
          })
          const testresult = await submittoken(resulttoken);

          let testcasespassed = 0;
          let runtime = 0 ;
          let memory = 0;
          let status = 'accepted';
          let errormessage = '';
          for(const test of testresult){
            const currentStatusId = test.status?.id || test.status_id;
            console.log(currentStatusId)
            if(currentStatusId === 3){ // Accepted 
                testcasespassed++;
                runtime = runtime + parseFloat(test.time) || 0;
                memory = Math.max(memory , test.memory) || 0;
            }
            else{
                if(currentStatusId === 4){
                    status = 'error'; 
                    errormessage = test.stderr;
                }
                else{
                    status = 'wrong';
                    errormessage = test.stderr;
                }
            }
          }

          submissionresult.status = status;
          submissionresult.testcasespassed = testcasespassed;
          submissionresult.errormessage = errormessage;
          submissionresult.runtime = runtime;
          submissionresult.memory = memory;

          await submissionresult.save();

          let isFirstSolve = false;
        let scoreAwarded = 0;

        // ================= SCORE & BATTLE LOGIC ===================
        if (status === 'accepted') {
            if (isBattle && roomCode) {
                // 🚀 BATTLE MODE: Bet amount handle karein (Winner ko +bet, Loser ko -bet)
                const room = await getRoom(roomCode);
                if (room && room.status !== 'COMPLETED') {
                    room.status = 'COMPLETED';
                    await updateRoom(room);

                    const betAmount = Number(room.betAmount) || 10;
                    const winnerId = String(userid);
                    
                    const hostId = String(room.host?.userId || room.host?._id);
                    const guestId = room.guest ? String(room.guest?.userId || room.guest?._id) : null;
                    const loserId = hostId === winnerId ? guestId : hostId;

                    if (loserId) {
                        // Winner score increase & Loser score decrease atomically
                        await user.findByIdAndUpdate(winnerId, {
                            $inc: { score: betAmount, "stats.battlesWon": 1, "stats.battlesPlayed": 1 }
                        });
                        await user.findByIdAndUpdate(loserId, {
                            $inc: { score: -betAmount, "stats.battlesLost": 1, "stats.battlesPlayed": 1 }
                        });

                        // MongoDB Battle document update agar maintain karte hain
                        if (room._id || room.id) {
                            await Room.findByIdAndUpdate(room._id || room.id, {
                                status: "COMPLETED",
                                winner: winnerId,
                                endedAt: Date.now()
                            }).catch(() => {});
                        }

                        console.log(`🏆 Battle API Win -> Winner: ${winnerId} (+${betAmount}), Loser: ${loserId} (-${betAmount})`);
                        
                        // Redis Room cleanup
                        await removeRoom(roomCode);
                    }
                }
            } else {
                // 📝 NORMAL PRACTICE MODE: Default problem score add karein
                const userSolvedList = req.result.problemsolved || [];
                const alreadySolved = userSolvedList.some(
                    (id) => id.toString() === problemid.toString()
                );

                if (!alreadySolved) {
                    isFirstSolve = true;
                    scoreAwarded = foundProblem.score ?? 5;

                    const updatedUser = await user.findByIdAndUpdate(
                        userid,
                        {
                            $addToSet: { problemsolved: problemid },
                            $inc: { score: scoreAwarded }
                        },
                        { returnDocument: 'after' }
                    );

                    if (updatedUser) {
                        req.result.score = updatedUser.score;
                    }
                }
            }
        }
        // ================= SCORE LOGIC END ===================

        res.status(201).json({
            status: submissionresult.status,
            runtime: submissionresult.runtime,
            memory: submissionresult.memory,
            totalTestCases: foundProblem.hiddentestcase.length,
            passedCount: testcasespassed,
            errorMessage: errormessage,
            isFirstSolve,
            scoreAwarded,
            totalScore: req.result.score,
            submission: submissionresult
        });
    }
    catch(err){
        console.log("Error in submitcode:", err);
        res.status(500).json({message: "Internal Server Error"});
    }
}

const runcode = async (req, res) => {
    try {
        const userid = req.result._id;
        const problemid = req.params.id;
        const { code, language } = req.body;

        console.log("--- New Run Request ---");
        console.log(`User: ${userid}, Problem: ${problemid}, Lang: ${language}`);

        if (!userid || !problemid || !code || !language) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const foundProblem = await problemmodel.findById(problemid);
        if (!foundProblem) {
            return res.status(404).json({ success: false, message: "Problem not found" });
        }

        const languageid = getlanguagebyid(language);
        if (!languageid) {
            return res.status(400).json({ success: false, message: "Invalid Language ID" });
        }

        if (!foundProblem.visibletestcase || foundProblem.visibletestcase.length === 0) {
            return res.status(400).json({ success: false, message: "No test cases found" });
        }

        // 1. Prepare Submissions
        const submissions = foundProblem.visibletestcase.map((testcase) => ({
            source_code: Buffer.from(code).toString('base64'),
            language_id: languageid,
            stdin: Buffer.from(testcase.input || "").toString('base64'),
            expected_output: Buffer.from(testcase.output || "").toString('base64')
        }));

        // 2. Submit to Judge0
        const submitresult = await submitbatch(submissions, { base64: true });
        
        if (!submitresult || !Array.isArray(submitresult)) {
            console.error("Judge0 Submission Error:", submitresult);
            return res.status(500).json({ success: false, error: "Judge0 submission failed" });
        }

        const resulttokens = submitresult.map((item) => item.token).join(',');
        console.log("Tokens received:", resulttokens);

        // 3. POLLING LOGIC: Judge0 ko process karne ke liye time chahiye hota hai
        let testresult;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            // submittoken function se results fetch karo
            testresult = await submittoken(resulttokens); 
            
            // Check if all submissions are finished (status id 1 and 2 are 'In Queue' and 'Processing')
            const isProcessing = testresult.submissions?.some(s => s.status_id <= 2);
            
            if (!isProcessing) break;

            console.log(`Attempt ${attempts + 1}: Code still processing...`);
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second wait
            attempts++;
        }

        // 4. Debugging: Terminal mein check karein
        console.log("Final Judge0 Result:", JSON.stringify(testresult, null, 2));

        // 5. Proper Response Format
        // Agar Judge0 se submissions array aa raha hai, toh wahi bhejien
        return res.status(200).json({
            success: true,
            results: testresult.submissions || testresult 
        });

    } catch (err) {
        console.error("CRITICAL ERROR IN RUNCODE:", err);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error", 
            error: err.message 
        });
    }
}

module.exports = {submitcode , runcode};