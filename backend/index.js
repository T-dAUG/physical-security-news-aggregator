// Add this to your index.js after your existing server setup

// Initialize scheduler (smart environment detection)
const scheduler = require('./scheduler');

// Initialize scheduler after server starts
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

// Add scheduler status endpoint
app.get('/scheduler/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

const PORT = process.env.PORT || 4000;  // Railway sets PORT automatically
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
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