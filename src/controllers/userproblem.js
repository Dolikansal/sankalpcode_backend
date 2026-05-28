const {getlanguagebyid , submitbatch , submittoken} = require("../utils/problemutility");
const problem = require("../models/problem");
const user = require("../models/user");
const submission = require("../models/submission");
const mongoose = require('mongoose');
const createproblem = async (req,res)=>{

    const {title,description,difficulty,tags,
        visibletestcase,hiddentestcase,startcode,
        referencesolution, problemcreator
    } = req.body;


    try{
       
        if (!visibletestcase || !Array.isArray(visibletestcase)) {
            throw new Error("visibletestcase field is missing or not an array");
        }
      for(const {language,completecode} of referencesolution){
         
        const languageId = getlanguagebyid(language);
        
        const submissions = visibletestcase.map((testcase) => ({
            // Base64 encoding ensure karegi ki code crash na ho
            source_code: Buffer.from(completecode).toString('base64'),
            language_id: languageId,
            stdin: Buffer.from(testcase.input).toString('base64'),
            expected_output: Buffer.from(testcase.output).toString('base64')
        }));


        const submitResult = await submitbatch(submissions , { base64: true });
        // console.log(submitResult);

        const resultToken = submitResult.map((value)=> value.token);

        // ["db54881d-bcf5-4c7b-a2e3-d33fe7e25de7","ecc52a9b-ea80-4a00-ad50-4ab6cc3bb2a1","1b35ec3b-5776-48ef-b646-d5522bdeb2cc"]
        
       const testResult = await submittoken(resultToken);


       console.log(testResult);

       for(const test of testResult){
        if(test.status_id!=3){
            console.log("❌ Test Failed! Reason:", test.status.description);
        console.log("📝 Compile Output:", Buffer.from(test.compile_output || "", 'base64').toString());
         return res.status(400).send("Error Occured");
        }
       }

      }


      // We can store it in our DB

    const userProblem =  await problem.create({
        ...req.body,
        // problemcreator: req.result?._id || req.body.problemcreator
        problemcreator: req.result?._id || "654321abcdef1234567890ab"
      });

      res.status(201).send("Problem Saved Successfully");
    }
    catch(err){
        console.log("Submit Error Detail:", err.response?.data || err.message);
    }
}

const updateproblem = async(req , res) =>{

    const {id} = req.params;
    const {title , description , difficulty , tags , visibletestcase , 
        hiddentestcase , startcode , referencesolution, problemcreator
    } = req.body;

    try{

            if(!id){
                return res.status(400).json({ error: "Problem ID is required for update." });
            }

            const dsaproblem = await problem.findById(id);
            if(!dsaproblem){
                return res.status(404).json({ error: "Problem not found with the provided ID." }); 
            }

            for(const {language , completecode} of referencesolution){
                // source code
                // language_id
                // stdin
                // expected_output
                const languageid = getlanguagebyid(language);
                // creating batch submissions
                const submissions = visibletestcase.map((testcase) => ({
                    // Base64 encoding ensure karegi ki code crash na ho
                    source_code: Buffer.from(completecode).toString('base64'),
                    language_id: languageid,
                    stdin: Buffer.from(testcase.input).toString('base64'),
                    expected_output: Buffer.from(testcase.output).toString('base64')
                }));
                const submitresult =await submitbatch(submissions);
                console.log("Submit Batch Result:", submitresult);
                if (!submitresult || !Array.isArray(submitresult)) {
                    throw new Error("API ne tokens nahi bheje");
                }
               const resulttoken = submitresult.map((tokens)=>{
                 return tokens.token
               })
    
              const testresult = await submittoken(resulttoken);
              for (const test of testresult){
                console.log("Judge0 Result Detail:", {
                    status: test.status.description, // Batayega "Wrong Answer" ya "Accepted"
                    stdout: test.stdout,             // Tera code kya print kar raha hai
                    expected: test.expected_output,  // Tumne kya expect kiya tha
                    error: test.compile_output       // Agar compile error hai
                });
            
                if (test.status_id !== 3) {
                    return res.status(400).json({ 
                        error: "Reference solution failed on visible test cases.",
                        details: test.status.description 
                    });
                }
              }
            }

        const newproblem = await problem.findByIdAndUpdate(id , {...req.body} , {runValidators:true , new:true});
        res.status(200).send(newproblem);
    }
    catch(err){
        console.log("❌ Controller Error:", err.message);
        res.status(500).json({ error: err.message });
    }
}

const deleteproblem = async(req , res) =>{
    const {id} = req.params;
    try{
        if(!id){
            return res.status(400).json({ error: "Problem ID is required for deletion." });
        }
        const deleteproblem = await problem.findByIdAndDelete(id);
        if(!deleteproblem){
            return res.status(404).json({ error: "Problem not found with the provided ID." }); 
        }
        res.status(200).send({message:"Problem deleted successfully!"});
    }
    catch(err){
        console.log("❌ Controller Error:", err.message);
        res.status(500).json({ error: err.message });
    }
}

const getproblembyid = async(req , res)=>{
    const {id} = req.params;
    try{
        if(!id){
            return res.status(400).json({ error: "Problem ID is required." });
        }
        const dsaproblem = await problem.findById(id).select("_id title description difficulty tags visibletestcase startcode referencesolution");
        if(!dsaproblem){
            return res.status(404).json({ error: "Problem not found with the provided ID." }); 
        }
        res.status(200).send(dsaproblem);
    }
    catch(err){
        console.log("❌ Controller Error:", err.message);
        res.status(500).json({ error: err.message });
    }
}

const getallproblem = async(req , res)=>{
    try{
        const getproblem = await problem.find({}).select("_id title difficulty tags");

        if(getproblem.length === 0){
            return res.status(404).json({ error: "No problems found in the database." }); 
        }

        res.status(200).send(getproblem);
    }
    catch(err){
        console.log("❌ Controller Error:", err.message);
        res.status(500).json({ error: err.message });
    }
}

const solvedprobelmbyuser = async(req , res) =>{
    try{
        const userid = req.result._id;
        const userinfo = await user.findById(userid).populate({
            path: "problemsolved",
            select: "_id title difficulty tags"});

        res.status(200).send(userinfo.problemsolved);
    }
    catch(err){
        console.log("❌ Controller Error:", err.message);
        res.status(500).json({ error: err.message });
    }
}


const getsubmittedproblem = async(req , res) =>{
    try{
        console.log("Logged in User ID from middleware:", req.result?._id);
       console.log("Problem ID from params:", req.params.id);
       const userid = req.result._id;
       const problemid = req.params.id;
       if(!userid) {
        return res.status(401).json({ error: "User ID not found in request. Check middleware." });
    }
    const ans = await submission.find({
        userid: new mongoose.Types.ObjectId(userid), 
        problemid: new mongoose.Types.ObjectId(problemid)
    }).sort({ createdAt: -1 });
       console.log("Submissions found:", ans.length);
       if(ans.length === 0){
        // 404 bhejne se frontend error throw karega, empty array bhejna better hai
        return res.status(200).json([]); 
       }
       else{
        res.status(200).send(ans); 
       }
       
    }
    catch(err){
        console.log("❌ Controller Error:", err.message);
        res.status(500).json({ error: err.message });
    }
}
module.exports = {createproblem , updateproblem , deleteproblem , getproblembyid , getallproblem , solvedprobelmbyuser ,getsubmittedproblem};