// scripts/fix-collections.js
const mongoose = require('mongoose');
require('dotenv').config();

async function repairQuestionCollection() {
  try {
    // Connect to the database first
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
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
      } else {
        console.log('No problematic questionNumber index found');
      }
    } else {
      console.log('Questions collection does not exist yet');
    }
    
    console.log('Collection repair completed successfully');
  } catch (error) {
    console.error('Error repairing collection:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Mongoose connection closed');
  }
}

// Run the repair function
repairQuestionCollection();