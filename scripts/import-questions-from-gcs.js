// scripts/import-questions-from-gcs.js
const mongoose = require('mongoose');
const Question = require('../models/Question');
const { listFiles, getSignedUrl } = require('../utils/storageService');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Directory in your GCS bucket
const PROMPTS_PREFIX = 'prompts/';

// Function to import questions from GCS files
async function importQuestionsFromGCS() {
  try {
    // List all files in the prompts directory
    const files = await listFiles(PROMPTS_PREFIX);
    
    console.log(`Found ${files.length} files in GCS bucket under ${PROMPTS_PREFIX}`);
    
    // Filter for audio files
    const audioFiles = files.filter(file => 
      ['.mp3', '.wav', '.ogg'].some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    console.log(`Found ${audioFiles.length} audio files`);
    
    // Create questions based on the files
    const questions = [];
    let counter = 1;
    
    for (const file of audioFiles) {
      // Extract question number from filename if possible
      let questionNumber = counter;
      const filename = file.name.split('/').pop(); // Get just the filename without path
      const match = filename.match(/(\d+)/);
      if (match) {
        questionNumber = parseInt(match[1], 10);
      }
      
      // Generate a signed URL for the file
      const audioUrl = await getSignedUrl(file.path);
      
      questions.push({
        questionNumber,
        text: `Question ${questionNumber}: Please respond to this audio prompt.`,
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: "Listen carefully and speak clearly into the microphone.",
        category: "language-assessment"
      });
      
      console.log(`Processed question ${questionNumber}: ${file.name}`);
      counter++;
    }
    
    // Check if questions already exist
    const existingCount = await Question.countDocuments();
    
    if (existingCount > 0) {
      console.log(`${existingCount} questions already exist in the database.`);
      const answer = await promptConfirmation('Replace existing questions? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('Import cancelled');
        process.exit(0);
      }
      await Question.deleteMany({});
      console.log('Existing questions deleted');
    }
    
    // Insert the questions
    if (questions.length > 0) {
      await Question.insertMany(questions);
      console.log(`Successfully imported ${questions.length} questions`);
    } else {
      console.log('No questions to import');
    }
  } catch (error) {
    console.error('Error importing questions:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Helper function for command line confirmation
function promptConfirmation(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run the import
importQuestionsFromGCS();