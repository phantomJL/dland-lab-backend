// controllers/recordingController.js - Updated uploadRecording function
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
      testIndex: testIndex || 0,
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
        testIndex: testIndex || 0
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
          testIndex: testIndex || 0,
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

// Get recordings for a participant with specific language and test index
exports.getRecordingsByParticipantAndLanguage = async (req, res) => {
  try {
    const { participantId } = req.params;
    const language = req.query.language || 'english';
    const testIndex = parseInt(req.query.testIndex || '0');
    
    const recordings = await Recording.find({ 
      participantId,
      language,
      testIndex
    })
      .populate('questionId', 'questionNumber text')
      .sort('createdAt');
    
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};