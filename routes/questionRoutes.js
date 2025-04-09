const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const auth = require('../middleware/auth');

// GET /api/questions
router.get('/', questionController.getQuestions);

// GET /api/questions/:id
router.get('/:id', questionController.getQuestion);

// POST /api/questions
router.post('/', auth, questionController.createQuestion);

// PUT /api/questions/:id
router.put('/:id', auth, questionController.updateQuestion);

// DELETE /api/questions/:id
router.delete('/:id', auth, questionController.deleteQuestion);

module.exports = router;