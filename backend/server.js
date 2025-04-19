// server.js - Main entry point
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const routes = require('./routes');
const { setupICalJob, setupEmailJob } = require('./workers');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Start server
async function startServer() {
  try {
    await db.connect();
    console.log('Connected to database');
    
    // Start background jobs
    setupICalJob();
    setupEmailJob();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();