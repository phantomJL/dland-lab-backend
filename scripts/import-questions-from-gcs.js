// scripts/import-questions-from-gcs.js
const mongoose = require('mongoose');
const Question = require('../models/Question');
const { listFiles, getSignedUrl } = require('../utils/storageService');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Base directory in your GCS bucket
const BASE_PREFIX = 'prompts/';
const ENGLISH_PREFIX = 'prompts/english_sentences/';
const MANDARIN_PREFIX = 'prompts/mandarin_sentences/';

// Function to import questions from GCS files with language support
async function importQuestionsFromGCS(language = 'english') {
  try {
    console.log(`Starting import for ${language} questions...`);
    
    // STEP 1: Drop all indices and recreate the collection
    console.log('Attempting to fix database structure...');
    
    try {
      // Try to drop the entire collection first
      await mongoose.connection.db.collection('questions').drop();
      console.log('Questions collection dropped successfully');
    } catch (dropError) {
      console.log('Could not drop collection. Error:', dropError.message);
      
      // Try to delete all documents
      try {
        await Question.deleteMany({});
        console.log('All questions deleted');
      } catch (deleteError) {
        console.log('Could not delete questions. Error:', deleteError.message);
      }
      
      // Try to drop the problematic index directly
      try {
        await mongoose.connection.db.collection('questions').dropIndex('questionNumber_1');
        console.log('Dropped questionNumber_1 index');
      } catch (indexError) {
        console.log('Could not drop index. Error:', indexError.message);
      }
    }
    
    // STEP 2: Recreate the schema without the problematic index
    try {
      // Define a temporary schema without indices
      const tempSchema = new mongoose.Schema({
        sequenceId: Number,
        audioType: String,
        displayNumber: Number, // Will always use a number, never null
        text: String,
        audioPromptUrl: String,
        audioPromptStoragePath: String,
        instructions: String,
        category: String,
        requiresRecording: Boolean,
        language: String, // Added language field
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });
      
      // Force recreate the model
      delete mongoose.models.Question;
      mongoose.model('Question', tempSchema);
      
      console.log('Recreated Question model without indices');
    } catch (schemaError) {
      console.log('Error recreating schema:', schemaError.message);
    }

    // Use the appropriate prefix based on language
    const PREFIX = language === 'chinese' ? MANDARIN_PREFIX : ENGLISH_PREFIX;
    
    console.log(`Listing files from: ${PREFIX}`);
    
    // List all files in the appropriate language directory
    const files = await listFiles(PREFIX);
    
    console.log(`Found ${files.length} files in GCS bucket under ${PREFIX}`);
    
    // Filter for audio files
    const audioFiles = files.filter(file => 
      ['.mp3', '.wav', '.ogg'].some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    console.log(`Found ${audioFiles.length} audio files`);
    
    // Create questions based on the files
    const questions = [];
    
    // First, find and process instruction files - case insensitive matching
    const instructionFiles = audioFiles.filter(file => 
      file.name.toLowerCase().includes('instruction')
    );
    
    console.log(`Found ${instructionFiles.length} instruction files`);
    
    for (let i = 0; i < instructionFiles.length; i++) {
      const file = instructionFiles[i];
      // Generate a signed URL for the file
      const audioUrl = await getSignedUrl(file.path);
      
      // Create translations based on language
      const instructionTexts = {
        english: {
          text: "Instructions",
          instructions: "Please listen to these instructions carefully."
        },
        chinese: {
          text: "指示",
          instructions: "请仔细听这些指示。"
        }
      };
      
      const localizedText = instructionTexts[language] || instructionTexts.english;
      
      questions.push({
        sequenceId: 1 + i,
        audioType: "instruction",
        displayNumber: 0, // Use 0 instead of null
        text: localizedText.text,
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: localizedText.instructions,
        category: "instruction",
        requiresRecording: false,
        language: language
      });
      
      console.log(`Processed instruction file: ${file.name}`);
    }
    
    // Next, process practice files - case insensitive matching
    const practiceFiles = audioFiles.filter(file => 
      file.name.toLowerCase().includes('practice')
    );
    
    console.log(`Found ${practiceFiles.length} practice files`);
    
    // Sort practice files by number if possible
    practiceFiles.sort((a, b) => {
      const numA = parseInt((a.name.match(/practice\s*(\d+)/i) || [0, 0])[1], 10);
      const numB = parseInt((b.name.match(/practice\s*(\d+)/i) || [0, 0])[1], 10);
      return numA - numB;
    });
    
    for (let i = 0; i < practiceFiles.length; i++) {
      const file = practiceFiles[i];
      // Extract practice number from filename
      const filename = file.name.split('/').pop(); // Get just the filename without path
      let practiceNumber = i + 1; // Default to index + 1
      
      // Try to extract the number after "practice"
      const match = filename.toLowerCase().match(/practice\s*(\d+)/i);
      if (match) {
        practiceNumber = parseInt(match[1], 10);
      }
      
      // Generate a signed URL for the file
      const audioUrl = await getSignedUrl(file.path);
      
      // Create translations based on language
      const practiceTexts = {
        english: {
          text: `Practice ${practiceNumber}`,
          instructions: "This is a practice question. Please respond to familiarize yourself with the recording system."
        },
        chinese: {
          text: `练习 ${practiceNumber}`,
          instructions: "这是一个练习问题。请回答以熟悉录音系统。"
        }
      };
      
      const localizedText = practiceTexts[language] || practiceTexts.english;
      
      questions.push({
        sequenceId: instructionFiles.length + 1 + i,
        audioType: "practice",
        displayNumber: practiceNumber,
        text: localizedText.text,
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: localizedText.instructions,
        category: "practice",
        requiresRecording: true,
        language: language
      });
      
      console.log(`Processed practice question ${practiceNumber}: ${file.name}`);
    }
    
    // Finally, process test questions - filter files that don't match instructions or practice
    const testFiles = audioFiles.filter(file => 
      !file.name.toLowerCase().includes('instruction') && 
      !file.name.toLowerCase().includes('practice')
    );
    
    console.log(`Found ${testFiles.length} test files`);
    
    // Sort test files by number if possible (look for numbers in filenames)
    testFiles.sort((a, b) => {
      // Try to extract any number from the filename
      const numA = parseInt((a.name.match(/(\d+)/) || [0, 0])[1], 10);
      const numB = parseInt((b.name.match(/(\d+)/) || [0, 0])[1], 10);
      
      if (numA && numB) {
        return numA - numB;
      }
      
      // If no numbers found, sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Create translations based on language
    const testTexts = {
      english: {
        textPrefix: "Question",
        instructions: "Listen carefully and speak clearly into the microphone."
      },
      chinese: {
        textPrefix: "问题",
        instructions: "请仔细听并清晰地对着麦克风说话。"
      }
    };
    
    const localizedText = testTexts[language] || testTexts.english;
    
    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];
      const filename = file.name.split('/').pop(); // Get just the filename without path
      
      // Try to extract a number from the filename
      const match = filename.match(/(\d+)/);
      let questionNumber = match ? parseInt(match[1], 10) : i + 1;
      
      // Generate a signed URL for the file
      const audioUrl = await getSignedUrl(file.path);
      
      questions.push({
        sequenceId: instructionFiles.length + practiceFiles.length + 1 + i,
        audioType: "test",
        displayNumber: questionNumber,
        text: `${localizedText.textPrefix} ${questionNumber}`,
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: localizedText.instructions,
        category: "test",
        requiresRecording: true,
        language: language
      });
      
      console.log(`Processed test question ${questionNumber}: ${file.name}`);
    }
    
    // Sort questions by sequenceId to ensure proper order
    questions.sort((a, b) => a.sequenceId - b.sequenceId);
    
    // Report what we found
    console.log(`\nQuestion summary for ${language}:`);
    console.log(`- Instruction questions: ${questions.filter(q => q.category === 'instruction').length}`);
    console.log(`- Practice questions: ${questions.filter(q => q.category === 'practice').length}`);
    console.log(`- Test questions: ${questions.filter(q => q.category === 'test').length}`);
    console.log(`- Total questions: ${questions.length}`);
    
    // Insert questions using a direct MongoDB insert
    if (questions.length > 0) {
      try {
        console.log('Inserting questions directly to MongoDB...');
        const result = await mongoose.connection.db.collection('questions').insertMany(questions);
        console.log(`Successfully inserted ${result.insertedCount} questions directly to MongoDB`);
      } catch (directInsertError) {
        console.error('Error direct inserting questions:', directInsertError.message);
        
        // Last resort: Try inserting one by one using MongoDB native driver
        console.log('Attempting individual document inserts using direct MongoDB insert...');
        let insertedCount = 0;
        
        for (const question of questions) {
          try {
            await mongoose.connection.db.collection('questions').insertOne(question);
            insertedCount++;
          } catch (singleInsertError) {
            console.error(`Error inserting question ${question.audioType} ${question.displayNumber}:`, 
              singleInsertError.message);
          }
        }
        
        console.log(`Successfully inserted ${insertedCount} of ${questions.length} questions directly`);
      }
      
      // Print out a summary of what was imported
      try {
        const importedQuestions = await mongoose.connection.db.collection('questions').find({language: language}).sort({ sequenceId: 1 }).toArray();
        console.log(`\nImported ${language} questions (in order):`);
        
        importedQuestions.forEach(q => {
          console.log(`- [${q.category}] ${q.text} (sequence: ${q.sequenceId}, type: ${q.audioType}, number: ${q.displayNumber})`);
        });
      } catch (findError) {
        console.error('Error retrieving imported questions:', findError.message);
      }
    } else {
      console.log(`No ${language} questions to import`);
    }
    
    return questions.length;
  } catch (error) {
    console.error('Error importing questions:', error);
    return 0;
  }
}

// Helper function to determine if a file path belongs to a specific language
function getLanguageFromPath(path) {
  if (path.includes('mandarin_sentences') || path.includes('chinese')) {
    return 'chinese';
  }
  return 'english';
}

// Main function to import all languages
async function importAllLanguages() {
  try {
    // Import English questions
    console.log('\n========== IMPORTING ENGLISH QUESTIONS ==========\n');
    const englishCount = await importQuestionsFromGCS('english');
    
    // Import Chinese questions
    console.log('\n========== IMPORTING CHINESE QUESTIONS ==========\n');
    const chineseCount = await importQuestionsFromGCS('chinese');
    
    console.log('\n========== IMPORT SUMMARY ==========');
    console.log(`Total English questions imported: ${englishCount}`);
    console.log(`Total Chinese questions imported: ${chineseCount}`);
    console.log(`Total questions imported: ${englishCount + chineseCount}`);
    
  } catch (error) {
    console.error('Error importing questions for all languages:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the import for all languages
importAllLanguages();