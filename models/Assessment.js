const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    ref: 'Participant'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  lastQuestionIndex: {
    type: Number,
    default: 0
  },
  notes: String
});

module.exports = mongoose.model('Assessment', AssessmentSchema);