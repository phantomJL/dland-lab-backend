// controllers/recordingController.js
const Recording = require('../models/Recording');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const Assessment = require('../models/Assessment');
const { uploadFile } = require('../utils/storageService');

// Upload recording
exports.uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }
    
    const { participantId, questionId, duration, language, testIndex } = req.body;
    
    // Validate question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Check if participant exists, create if not
    let participant = await Participant.findOne({ participantId });
    if (!participant) {
      participant = new Participant({ participantId });
      await participant.save();
    }
    
    // Create a unique filename with timestamp and language
    const timestamp = Date.now();
    const languageCode = language || 'en';
    const testIdx = testIndex || 0;
    const filename = `recordings/${participantId}/${languageCode}_${testIdx}_${questionId}_${timestamp}.wav`;
    
    // Upload to cloud storage
    const fileData = await uploadFile(req.file, filename);
    
    // Create recording record
    const recording = new Recording({
      participantId,
      questionId,
      language: language || 'english',
      testIndex: parseInt(testIndex) || 0,
      audioUrl: fileData.url,
      audioStoragePath: fileData.path,
      durationMs: duration || 0
    });
    
    await recording.save();
    
    // Update assessment status
    try {
      let assessment = await Assessment.findOne({ 
        participantId,
        language: language || 'english',
        testIndex: parseInt(testIndex) || 0
      });
      
      // Determine the question index safely
      let questionIndex = 0;
      if (question.questionNumber !== undefined) {
        questionIndex = question.questionNumber - 1;
      } else if (question.sequenceId !== undefined) {
        questionIndex = question.sequenceId - 1;
      }
      
      // Ensure questionIndex is a valid number
      if (isNaN(questionIndex) || questionIndex < 0) {
        questionIndex = 0;
      }
      
      if (!assessment) {
        assessment = new Assessment({
          participantId,
          language: language || 'english',
          testIndex: parseInt(testIndex) || 0,
          status: 'in_progress',
          startedAt: new Date(),
          lastQuestionIndex: questionIndex
        });
      } else {
        assessment.status = 'in_progress';
        // Only update lastQuestionIndex if the new index is greater than the current one
        // and is a valid number
        if (!isNaN(questionIndex) && (isNaN(assessment.lastQuestionIndex) || questionIndex > assessment.lastQuestionIndex)) {
          assessment.lastQuestionIndex = questionIndex;
        }
      }
      
      await assessment.save();
    } catch (assessmentError) {
      console.error('Error updating assessment:', assessmentError);
      // Continue with the response even if assessment update fails
    }
    
    res.status(201).json({
      success: true,
      recording: {
        id: recording._id,
        audioUrl: recording.audioUrl,
        language: recording.language,
        testIndex: recording.testIndex
      }
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recordings for a participant
exports.getRecordingsByParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    const language = req.query.language || 'english';
    const testIndex = parseInt(req.query.testIndex || '0');
    
    // If specific language and test index are provided, filter by them
    const filter = { participantId };
    if (language) filter.language = language;
    if (!isNaN(testIndex)) filter.testIndex = testIndex;
    
    const recordings = await Recording.find(filter)
      .populate('questionId', 'questionNumber text audioType displayNumber')
      .sort('createdAt');
    
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific recording
exports.getRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('questionId', 'questionNumber text audioPromptUrl');
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a recording
exports.deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    // TODO: Delete file from cloud storage
    
    await recording.remove();
    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get assessment statistics
exports.getAssessmentStats = async (req, res) => {
  try {
    const { participantId } = req.params;
    const language = req.query.language || 'english';
    const testIndex = parseInt(req.query.testIndex || '0');
    
    const filter = { 
      participantId,
      language,
      testIndex
    };
    
    const totalRecordings = await Recording.countDocuments(filter);
    const totalQuestions = await Question.countDocuments({
      language: language
    });
    const completionPercentage = Math.round((totalRecordings / totalQuestions) * 100);
    
    const assessment = await Assessment.findOne({
      participantId,
      language,
      testIndex
    });
    
    res.json({
      totalRecordings,
      totalQuestions,
      completionPercentage,
      status: assessment ? assessment.status : 'not_started',
      startedAt: assessment ? assessment.startedAt : null,
      completedAt: assessment ? assessment.completedAt : null,
      lastQuestionIndex: assessment ? assessment.lastQuestionIndex : 0,
      language,
      testIndex
    });
  } catch (error) {
    console.error('Error fetching assessment stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};