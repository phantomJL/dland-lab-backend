const express = require('express');
const router = express.Router();
const recordingController = require('../controllers/recordingController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

// POST /api/recordings
router.post('/', upload.single('recording'), recordingController.uploadRecording);

// GET /api/recordings/participant/:participantId
router.get('/participant/:participantId', recordingController.getRecordingsByParticipant);

// GET /api/recordings/:id
router.get('/:id', recordingController.getRecording);

// DELETE /api/recordings/:id
router.delete('/:id', auth, recordingController.deleteRecording);

// GET /api/recordings/stats/:participantId
router.get('/stats/:participantId', recordingController.getAssessmentStats);

module.exports = router;