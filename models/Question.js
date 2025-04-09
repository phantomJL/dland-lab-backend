const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  audioPromptUrl: {
    type: String,
    required: true
  },
  audioPromptStoragePath: {
    type: String
  },
  instructions: String,
  category: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Question', QuestionSchema);