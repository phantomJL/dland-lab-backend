const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const participantRoutes = require('./routes/participantRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/participants', participantRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('DLanD Lab API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File is too large. Maximum size is 10MB.' });
  }
  
  res.status(500).json({ message: err.message || 'Something went wrong on the server' });
});

// Set port
const PORT = process.env.PORT || 5000;

// Connect to the database and then start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();