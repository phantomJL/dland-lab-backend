// controllers/assessmentController.js - Updated functions
const Assessment = require('../models/Assessment');
const Recording = require('../models/Recording');
const Question = require('../models/Question');
const Participant = require('../models/Participant');

// Get all assessments for a participant
exports.getParticipantAssessments = async (req, res) => {
  try {
    const { participantId } = req.params;
    
    // Check if participant exists
    const participant = await Participant.findOne({ participantId });
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Get all assessments for this participant
    const assessments = await Assessment.find({ participantId }).sort('-startedAt');
    
    // Add completion stats for each assessment
    const assessmentsWithStats = await Promise.all(
      assessments.map(async (assessment) => {
        const totalRecordings = await Recording.countDocuments({ 
          participantId: assessment.participantId,
          language: assessment.language,
          testIndex: assessment.testIndex 
        });
        // Query questions based on language
        const totalQuestions = await Question.countDocuments({
          language: assessment.language
        });
        const completionPercentage = Math.round((totalRecordings / totalQuestions) * 100);
        
        return {
          ...assessment._doc,
          totalRecordings,
          totalQuestions,
          completionPercentage
        };
      })
    );
    
    res.json(assessmentsWithStats);
  } catch (error) {
    console.error('Error fetching participant assessments:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get assessment status with specific language and test index
exports.getAssessmentStatus = async (req, res) => {
  try {
    const { participantId } = req.params;
    const language = req.query.language || 'english';
    const testIndex = parseInt(req.query.testIndex || '0');
    
    let assessment = await Assessment.findOne({ 
      participantId, 
      language, 
      testIndex 
    });
    
    if (!assessment) {
      assessment = {
        participantId,
        language,
        testIndex,
        status: 'not_started',
        lastQuestionIndex: 0
      };
    }
    
    res.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update assessment status with specific language and test index
exports.updateAssessmentStatus = async (req, res) => {
  try {
    const { participantId, status, lastQuestionIndex, language, testIndex } = req.body;
    
    let assessment = await Assessment.findOne({ 
      participantId, 
      language: language || 'english', 
      testIndex: testIndex || 0 
    });
    
    if (!assessment) {
      assessment = new Assessment({
        participantId,
        language: language || 'english',
        testIndex: testIndex || 0,
        status,
        lastQuestionIndex: lastQuestionIndex || 0
      });
      
      if (status === 'in_progress' && !assessment.startedAt) {
        assessment.startedAt = new Date();
      }
      
      if (status === 'completed' && !assessment.completedAt) {
        assessment.completedAt = new Date();
      }
    } else {
      assessment.status = status;
      
      if (lastQuestionIndex !== undefined) {
        assessment.lastQuestionIndex = lastQuestionIndex;
      }
      
      if (status === 'in_progress' && !assessment.startedAt) {
        assessment.startedAt = new Date();
      }
      
      if (status === 'completed' && !assessment.completedAt) {
        assessment.completedAt = new Date();
      }
    }
    
    await assessment.save();
    
    res.json(assessment);
  } catch (error) {
    console.error('Error updating assessment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all assessments (admin only)
exports.getAllAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find().sort('-startedAt');
    
    // Add completion stats
    const assessmentsWithStats = await Promise.all(
      assessments.map(async (assessment) => {
        const totalRecordings = await Recording.countDocuments({ 
          participantId: assessment.participantId,
          language: assessment.language,
          testIndex: assessment.testIndex
        });
        
        const totalQuestions = await Question.countDocuments({
          language: assessment.language
        });
        
        const completionPercentage = Math.round((totalRecordings / totalQuestions) * 100);
        
        return {
          ...assessment._doc,
          totalRecordings,
          totalQuestions,
          completionPercentage
        };
      })
    );
    
    res.json(assessmentsWithStats);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Server error' });
  }
};