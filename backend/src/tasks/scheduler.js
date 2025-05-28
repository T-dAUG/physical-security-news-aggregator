const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Physical Security News Aggregator API',
    status: 'running',
    version: '1.0.0'
  });
});

// Articles API endpoint
app.get('/api/articles', (req, res) => {
  res.json({
    message: 'Articles endpoint',
    articles: []
  });
});

// Initialize scheduler
const scheduler = require('./src/tasks/scheduler');

// Add scheduler status endpoint
app.get('/scheduler/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// Add manual job trigger endpoint (for admin/testing)
app.post('/scheduler/trigger/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    const validJobs = ['dailyScrape', 'cleanup', 'cacheCleanup'];
    
    if (!validJobs.includes(jobName)) {
      return res.status(400).json({ 
        error: 'Invalid job name', 
        validJobs 
      });
    }

    await scheduler.triggerJob(jobName);
    res.json({ 
      success: true, 
      message: `Job ${jobName} triggered successfully` 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Backend API is ready!');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Articles API: http://localhost:${PORT}/api/articles`);
  
  // Initialize scheduler with smart environment detection
  try {
    const schedulerStarted = await scheduler.initialize();
    if (schedulerStarted) {
      console.log('✅ Scheduler initialized successfully');
    } else {
      console.log('ℹ️ Scheduler disabled for this instance');
    }
  } catch (error) {
    console.error('❌ Scheduler initialization failed:', error.message);
    // Don't crash the server if scheduler fails
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  try {
    await scheduler.shutdown();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

app.server = server;
module.exports = app;