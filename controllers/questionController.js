const Question = require('../models/Question');
const { getSignedUrl } = require('../utils/storageService');

// Get all questions
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ questionNumber: 1 });
    
    // For each question, check if the audio URL needs to be refreshed
    const refreshedQuestions = await Promise.all(questions.map(async (question) => {
      const questionObj = question.toObject();
      
      // If the URL is a signed URL from GCS, it might be expired
      // We can check based on whether we have a storage path
      if (question.audioPromptStoragePath) {
        // Generate a fresh signed URL
        const freshUrl = await getSignedUrl(question.audioPromptStoragePath);
        questionObj.audioPromptUrl = freshUrl;
        
        // Optionally update the document in the database with the new URL
        await Question.findByIdAndUpdate(question._id, { audioPromptUrl: freshUrl });
      }
      
      return questionObj;
    }));
    
    res.json(refreshedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get single question
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new question
exports.createQuestion = async (req, res) => {
  try {
    const { questionNumber, text, audioPromptUrl, instructions, category } = req.body;
    
    // Check if question number already exists
    const existingQuestion = await Question.findOne({ questionNumber });
    if (existingQuestion) {
      return res.status(400).json({ message: 'Question number already exists' });
    }
    
    const question = new Question({
      questionNumber,
      text,
      audioPromptUrl,
      instructions,
      category
    });
    
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const { questionNumber, text, audioPromptUrl, instructions, category } = req.body;
    
    let question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Check if new question number conflicts with another question
    if (questionNumber !== question.questionNumber) {
      const existingQuestion = await Question.findOne({ questionNumber });
      if (existingQuestion && existingQuestion._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Question number already exists' });
      }
    }
    
    question.questionNumber = questionNumber;
    question.text = text;
    question.audioPromptUrl = audioPromptUrl;
    question.instructions = instructions;
    question.category = category;
    question.updatedAt = Date.now();
    
    await question.save();
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    await question.remove();
    res.json({ message: 'Question removed' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};