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
    
    const { participantId, questionId, duration } = req.body;
    
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
    
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const filename = `recordings/${participantId}/${questionId}_${timestamp}.wav`;
    
    // Upload to cloud storage
    const fileData = await uploadFile(req.file, filename);
    
    // Create recording record
    const recording = new Recording({
      participantId,
      questionId,
      audioUrl: fileData.url,
      audioStoragePath: fileData.path,
      durationMs: duration || 0
    });
    
    await recording.save();
    
    // Update assessment status
    let assessment = await Assessment.findOne({ participantId });
    if (!assessment) {
      assessment = new Assessment({
        participantId,
        status: 'in_progress',
        startedAt: new Date(),
        lastQuestionIndex: question.questionNumber - 1
      });
    } else {
      assessment.status = 'in_progress';
      assessment.lastQuestionIndex = Math.max(assessment.lastQuestionIndex, question.questionNumber - 1);
    }
    
    await assessment.save();
    
    res.status(201).json({
      success: true,
      recording: {
        id: recording._id,
        audioUrl: recording.audioUrl
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
      
      const recordings = await Recording.find({ participantId })
        .populate('questionId', 'questionNumber text')
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
      
      const totalRecordings = await Recording.countDocuments({ participantId });
      const totalQuestions = await Question.countDocuments();
      const completionPercentage = Math.round((totalRecordings / totalQuestions) * 100);
      
      const assessment = await Assessment.findOne({ participantId });
      
      res.json({
        totalRecordings,
        totalQuestions,
        completionPercentage,
        status: assessment ? assessment.status : 'not_started',
        startedAt: assessment ? assessment.startedAt : null,
        completedAt: assessment ? assessment.completedAt : null,
        lastQuestionIndex: assessment ? assessment.lastQuestionIndex : 0
      });
    } catch (error) {
      console.error('Error fetching assessment stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };