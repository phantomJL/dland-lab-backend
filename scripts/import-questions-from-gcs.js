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
    
    // First, find and process instruction files - case insensitive matching
    const instructionFiles = audioFiles.filter(file => 
      file.name.toLowerCase().includes('instruction')
    );
    
    console.log(`Found ${instructionFiles.length} instruction files`);
    
    for (let i = 0; i < instructionFiles.length; i++) {
      const file = instructionFiles[i];
      // Generate a signed URL for the file
      const audioUrl = await getSignedUrl(file.path);
      
      questions.push({
        sequenceId: 1 + i,
        audioType: "instruction",
        displayNumber: 0, // Use 0 instead of null
        text: "Instructions",
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: "Please listen to these instructions carefully.",
        category: "instruction",
        requiresRecording: false
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
      
      questions.push({
        sequenceId: instructionFiles.length + 1 + i,
        audioType: "practice",
        displayNumber: practiceNumber,
        text: `Practice ${practiceNumber}`,
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: "This is a practice question. Please respond to familiarize yourself with the recording system.",
        category: "practice",
        requiresRecording: true
      });
      
      console.log(`Processed practice question ${practiceNumber}: ${file.name}`);
    }
    
    // Finally, process test questions - M_TS files, case insensitive matching
    const testFiles = audioFiles.filter(file => 
      file.name.toLowerCase().includes('m_ts')
    );
    
    console.log(`Found ${testFiles.length} test files`);
    
    // Sort test files by number if possible
    testFiles.sort((a, b) => {
      const numA = parseInt((a.name.match(/m_ts\s*(\d+)/i) || [0, 0])[1], 10);
      const numB = parseInt((b.name.match(/m_ts\s*(\d+)/i) || [0, 0])[1], 10);
      return numA - numB;
    });
    
    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];
      // Extract question number from filename
      const filename = file.name.split('/').pop(); // Get just the filename without path
      let questionNumber = null;
      
      // Try to extract the number after "M_TS"
      const match = filename.toLowerCase().match(/m_ts\s*(\d+)/i);
      if (match) {
        questionNumber = parseInt(match[1], 10);
      } else {
        // If no match, try to find any number in the filename
        const numMatch = filename.match(/(\d+)/);
        if (numMatch) {
          questionNumber = parseInt(numMatch[1], 10);
        } else {
          // If still no match, use the index in the array + 1
          questionNumber = i + 1;
        }
      }
      
      // Generate a signed URL for the file
      const audioUrl = await getSignedUrl(file.path);
      
      questions.push({
        sequenceId: instructionFiles.length + practiceFiles.length + 1 + i,
        audioType: "test",
        displayNumber: questionNumber,
        text: `Question ${questionNumber}`,
        audioPromptUrl: audioUrl,
        audioPromptStoragePath: file.path,
        instructions: "Listen carefully and speak clearly into the microphone.",
        category: "test",
        requiresRecording: true
      });
      
      console.log(`Processed test question ${questionNumber}: ${file.name}`);
    }
    
    // Sort questions by sequenceId to ensure proper order
    questions.sort((a, b) => a.sequenceId - b.sequenceId);
    
    // Report what we found
    console.log("\nQuestion summary:");
    console.log(`- Instruction questions: ${questions.filter(q => q.category === 'instruction').length}`);
    console.log(`- Practice questions: ${questions.filter(q => q.category === 'practice').length}`);
    console.log(`- Test questions: ${questions.filter(q => q.category === 'test').length}`);
    console.log(`- Total questions: ${questions.length}`);
    
    // Insert questions using a direct MongoDB insert instead of Mongoose
    // This bypasses any schema validations or hooks
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
        const importedQuestions = await mongoose.connection.db.collection('questions').find().sort({ sequenceId: 1 }).toArray();
        console.log("\nImported questions (in order):");
        
        importedQuestions.forEach(q => {
          console.log(`- [${q.category}] ${q.text} (sequence: ${q.sequenceId}, type: ${q.audioType}, number: ${q.displayNumber})`);
        });
      } catch (findError) {
        console.error('Error retrieving imported questions:', findError.message);
      }
    } else {
      console.log('No questions to import');
    }
  } catch (error) {
    console.error('Error importing questions:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the import

importQuestionsFromGCS();