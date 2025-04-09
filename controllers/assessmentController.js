const Assessment = require('../models/Assessment');
const Recording = require('../models/Recording');
const Question = require('../models/Question');

// Get assessment status
exports.getAssessmentStatus = async (req, res) => {
  try {
    const { participantId } = req.params;
    
    let assessment = await Assessment.findOne({ participantId });
    
    if (!assessment) {
      assessment = {
        participantId,
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

// Update assessment status
exports.updateAssessmentStatus = async (req, res) => {
  try {
    const { participantId, status, lastQuestionIndex } = req.body;
    
    let assessment = await Assessment.findOne({ participantId });
    
    if (!assessment) {
      assessment = new Assessment({
        participantId,
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

// Get all assessments
exports.getAllAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find().sort('-startedAt');
    
    // Add completion stats
    const assessmentsWithStats = await Promise.all(
      assessments.map(async (assessment) => {
        const totalRecordings = await Recording.countDocuments({ 
          participantId: assessment.participantId 
        });
        const totalQuestions = await Question.countDocuments();
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