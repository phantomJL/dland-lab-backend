const Participant = require('../models/Participant');
const Assessment = require('../models/Assessment');
const Recording = require('../models/Recording');

// Get all participants
exports.getAllParticipants = async (req, res) => {
  try {
    const participants = await Participant.find().sort('-createdAt');
    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get participant details
exports.getParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    
    const participant = await Participant.findOne({ participantId });
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Get assessment info
    const assessment = await Assessment.findOne({ participantId });
    
    // Get recording count
    const recordingCount = await Recording.countDocuments({ participantId });
    
    res.json({
      ...participant._doc,
      assessment: assessment || { status: 'not_started' },
      recordingCount
    });
  } catch (error) {
    console.error('Error fetching participant:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update participant
exports.updateParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    const { age, gender, language, notes } = req.body;
    
    let participant = await Participant.findOne({ participantId });
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    if (age) participant.age = age;
    if (gender) participant.gender = gender;
    if (language) participant.language = language;
    if (notes !== undefined) participant.notes = notes;
    
    await participant.save();
    
    res.json(participant);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ message: 'Server error' });
  }
};