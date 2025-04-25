const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Question = require('../models/Question');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Path to your prompts folder
const promptsDir = path.join(__dirname, '../public/audio/prompts');

// Function to scan the directory and create question records
async function importQuestionsFromFiles() {
  try {
    // Get all files in the prompts directory
    const files = fs.readdirSync(promptsDir);
    
    // Filter for audio files
    const audioFiles = files.filter(file => 
      ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase())
    );
    
    console.log(`Found ${audioFiles.length} audio files`);
    
    // Create questions based on the files
    let counter = 1;
    const questions = [];
    
    for (const file of audioFiles) {
      // Extract question number from filename if possible
      // Assuming filename format like "question1.mp3" or "q1.mp3" or "1.mp3"
      let questionNumber = counter;
      const match = file.match(/(\d+)/);
      if (match) {
        questionNumber = parseInt(match[1], 10);
      }
      
      questions.push({
        questionNumber,
        text: `Question ${questionNumber}: Please respond to this audio prompt.`,
        audioPromptUrl: `audio/prompts/${file}`,
        instructions: "Listen carefully and speak clearly into the microphone.",
        category: "language-assessment"
      });
      
      counter++;
    }
    
    // Check if questions already exist
    const existingCount = await Question.countDocuments();
    
    if (existingCount > 0) {
      const confirm = await promptConfirmation('Questions already exist in the database. Replace them? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Import cancelled');
        process.exit(0);
      }
      await Question.deleteMany({});
    }
    
    // Insert the questions
    await Question.insertMany(questions);
    console.log(`Successfully imported ${questions.length} questions`);
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
importQuestionsFromFiles();