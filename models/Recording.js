const mongoose = require('mongoose');

const RecordingSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    ref: 'Participant'
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  audioUrl: {
    type: String,
    required: true
  },
  audioStoragePath: {
    type: String,
    required: true
  },
  durationMs: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  transcription: String,
  analysisResults: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Recording', RecordingSchema);