// models/Question.js
const mongoose = require('mongoose');

// First, check if there's an existing model and try to delete any problematic indices
const checkAndFixCollection = async () => {
  try {
    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections({ name: 'questions' }).toArray();
    
    if (collections.length > 0) {
      // Get all indices
      const indices = await mongoose.connection.db.collection('questions').indexes();
      
      // Check for questionNumber index
      const questionNumberIndex = indices.find(idx => 
        idx.key && idx.key.questionNumber && idx.unique
      );
      
      if (questionNumberIndex) {
        // Drop the problematic index
        await mongoose.connection.db.collection('questions').dropIndex(questionNumberIndex.name);
        console.log('Dropped questionNumber index from questions collection');
      }
    }
  } catch (error) {
    console.error('Error checking/fixing collection:', error);
  }
};

// Call this function when the model is required
checkAndFixCollection().catch(err => console.error('Error initializing Question model:', err));

// Define the schema without a unique constraint on questionNumber
const QuestionSchema = new mongoose.Schema({
  // Sequence ID for ordering questions in the assessment flow
  sequenceId: {
    type: Number,
    required: true,
    index: true // Non-unique index for sorting
  },
  // Audio type as a string identifier (instruction, practice, test)
  audioType: {
    type: String,
    required: true,
    enum: ['instruction', 'practice', 'test'],
    index: true // Non-unique index for filtering
  },
  // Display number within each audio type (always use a number, never null)
  displayNumber: {
    type: Number,
    default: 0,  // Use 0 as default instead of null
    required: true
  },
  // Question text
  text: {
    type: String,
    required: true
  },
  // URL to the audio prompt
  audioPromptUrl: {
    type: String,
    required: true
  },
  // Storage path in cloud storage
  audioPromptStoragePath: {
    type: String,
    required: true
  },
  // Additional instructions for the question
  instructions: {
    type: String,
    default: ''
  },
  // Category (same as audioType for consistency)
  category: {
    type: String,
    enum: ['instruction', 'practice', 'test'],
    default: 'test'
  },
  // Whether the question requires a recording
  requiresRecording: {
    type: Boolean,
    default: true
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
QuestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// IMPORTANT: Do NOT create any unique indices here
// Instead, create a compound index that's non-unique
QuestionSchema.index({ audioType: 1, displayNumber: 1 }); 

// We explicitly avoid including the line:
// QuestionSchema.index({ questionNumber: 1 }, { unique: true });
// which might have been causing the issue

module.exports = mongoose.model('Question', QuestionSchema);