const express = require('express');
// const mongoose = require('mongoose');
const adminmiddleware = require('../middleware/adminmiddleware');
const usermiddleware = require('../middleware/usermiddleware'); 
const {createproblem , updateproblem , deleteproblem , getproblembyid , getallproblem,solvedprobelmbyuser,getsubmittedproblem } = require("../controllers/userproblem");
const problemroute = express.Router();


problemroute.post("/create" ,adminmiddleware, createproblem);
problemroute.put("/update/:id",adminmiddleware ,updateproblem);
problemroute.delete("/delete/:id",adminmiddleware , deleteproblem);
problemroute.get("/problemById/:id",usermiddleware , getproblembyid);
problemroute.get("/getallproblems",usermiddleware , getallproblem);
problemroute.get("/problemsolvedbyuser",usermiddleware , solvedprobelmbyuser);
problemroute.get("/submittedproblem/:id" , usermiddleware , getsubmittedproblem);

module.exports = problemroute;