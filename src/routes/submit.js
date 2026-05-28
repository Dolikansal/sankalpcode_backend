const express = require('express'); 
const submitrouter = express.Router();
const usermiddleware = require('../middleware/usermiddleware');
const {submitcode , runcode , getUserSubmissions} = require('../controllers/usersubmission');

submitrouter.post('/submit/:id' , usermiddleware , submitcode )
submitrouter.post('/runcode/:id' , usermiddleware , runcode )
module.exports = submitrouter;