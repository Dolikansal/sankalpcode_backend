const problemmodel = require('../models/problem');
const submission = require('../models/submission');
const {getlanguagebyid , submitbatch ,submittoken} = require('../utils/problemutility');
const submitcode = async(req , res)=>{
    try{
        const userid = req.result._id;
        const problemid = req.params.id;

        const {code , language} = req.body;

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
            // testCasesPassed : 0,
            hiddencasetotal : foundProblem.hiddentestcase.length
        })

        const languageid = getlanguagebyid(language);
        console.log("Debug - Language Name:", language, "ID Found:", languageid);
        // const submissions = problem.hiddentestcase.map((test) => {
        //     // Code ko safely string mein badalne ke liye
        //     const escapedCode = JSON.stringify(completecode);
        
        //     const wrappedCode = `
        // const code = ${escapedCode};
        // eval(code); // Code ko execute karke function define karo
        
        // try {
        //     const inputData = JSON.parse(\`${test.input}\`);
            
        //     // Regex jo har tarah ke function name ko dhoond lega
        //     const match = code.match(/function\\s+([a-zA-Z0-9_]+)/);
        //     if (!match) throw new Error("Function name not found");
        //     const functionName = match[1];
            
        //     let result;
        //     if (Array.isArray(inputData)) {
        //         result = eval(functionName)(...inputData);
        //     } else {
        //         result = eval(functionName)(inputData);
        //     }
            
        //     process.stdout.write(JSON.stringify(result));
        // } catch (e) {
        //     process.stderr.write(e.message);
        //     process.exit(1);
        // }
        // `;
        
        //     return {
        //         source_code: code,
        //         language_id: languageid,
        //         stdin: "", 
        //         expected_output: String(test.output), // Output ko string bana do matching ke liye
        //     };
        // });
        if (!languageid) {
            return res.status(400).json({ message: "Invalid Language selected" });
        }
        const submissions = foundProblem.hiddentestcase.map((testcase) => ({
            // Base64 encoding ensure karegi ki code crash na ho
            // source_code: Buffer.from(completecode).toString('base64'),
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
            if(test.status_id === 3){ // Accepted 
                testcasespassed++;
                runtime = runtime + parseFloat(test.time);
                memory = Math.max(memory , test.memory);
            }
            else{
                if(test.status_id === 4){
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

          if(!req.result.problemsolved.includes(problemid)){
            req.result.problemsolved.push(problemid);
            await req.result.save();
          }


          res.status(201).send(submissionresult);
    }
    catch(err){
        console.log(err);
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