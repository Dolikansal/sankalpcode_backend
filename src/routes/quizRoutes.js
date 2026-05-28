const express = require('express');
const router = express.Router();
const { generateMockQuiz } = require('../controllers/quizController');

router.post('/generate-quiz', generateMockQuiz);

module.exports = router;