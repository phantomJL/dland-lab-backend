const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const auth = require('../middleware/auth');

// GET /api/assessments/status/:participantId
router.get('/status/:participantId', assessmentController.getAssessmentStatus);

// POST /api/assessments/status
router.post('/status', assessmentController.updateAssessmentStatus);

// GET /api/assessments - Get all assessments (admin only)
router.get('/', auth, assessmentController.getAllAssessments);

module.exports = router;