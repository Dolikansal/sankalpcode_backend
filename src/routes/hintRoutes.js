const express = require('express');
const router = express.Router();
const { getCustomHint } = require('../controllers/hintController'); // Controller ko import kiya

// POST request for hints
router.post('/get-hint', getCustomHint);

module.exports = router;