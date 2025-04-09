const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const auth = require('../middleware/auth');

// GET /api/participants
router.get('/', auth, participantController.getAllParticipants);

// GET /api/participants/:participantId
router.get('/:participantId', participantController.getParticipant);

// PUT /api/participants/:participantId
router.put('/:participantId', auth, participantController.updateParticipant);

module.exports = router;