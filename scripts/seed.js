const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Sample questions data
const questions = [
  {
    questionNumber: 1,
    text: "Listen to the word and repeat it",
    audioPromptUrl: "https://storage.googleapis.com/dland-lab-recordings/prompts/question1.mp3",
    instructions: "Please repeat the word you hear",
    category: "word-repetition"
  },
  {
    questionNumber: 2,
    text: "What color is the sky?",
    audioPromptUrl: "https://storage.googleapis.com/dland-lab-recordings/prompts/question2.mp3",
    instructions: "Answer with a complete sentence",
    category: "basic-questions"
  },
];

// Create admin user
async function createAdminUser() {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@dlandlab.com' });
    
    if (!adminExists) {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@dlandlab.com',
        password: 'password123',
        role: 'admin'
      });
      
      await admin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Seed questions
async function seedQuestions() {
  try {
    // First, check how many questions we already have
    const count = await Question.countDocuments();
    
    if (count === 0) {
      // Insert all questions
      await Question.insertMany(questions);
      console.log(`${questions.length} questions seeded successfully`);
    } else {
      console.log(`Database already has ${count} questions, skipping seed`);
    }
  } catch (error) {
    console.error('Error seeding questions:', error);
  }
}

// Run the seed functions
async function seedDatabase() {
  try {
    await createAdminUser();
    await seedQuestions();
    
    console.log('Database seeding completed');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
  }
}

seedDatabase();