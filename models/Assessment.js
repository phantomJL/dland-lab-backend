// models/Assessment.js - Updated schema
const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    ref: 'Participant'
  },
  language: {
    type: String, 
    required: true,
    default: 'english'
  },
  testIndex: {
    type: Number,
    default: 0 // For tracking multiple tests in the same language
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

// Create a compound index to ensure one participant can have multiple assessments
// but only one assessment per language+testIndex combination
AssessmentSchema.index({ participantId: 1, language: 1, testIndex: 1 }, { unique: true });

module.exports = mongoose.model('Assessment', AssessmentSchema);