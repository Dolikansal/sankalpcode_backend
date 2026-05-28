// backend/routes/instructorRoute.js
const express = require('express');
const { askInstructor } = require('../controllers/instructor.js'); 

const router = express.Router();

router.post("/ask-instructor", askInstructor);

module.exports = router; // Isko CommonJS bana diya