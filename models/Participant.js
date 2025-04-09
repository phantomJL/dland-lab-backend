const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    unique: true
  },
  age: {
    type: Number
  },
  gender: {
    type: String
  },
  language: {
    type: String
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Participant', ParticipantSchema);