const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const articlesRouter = require('./routes/articles');
const logger = require('./utils/logger');
const scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 4000;
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/aggregation/trigger
router.post('/trigger', (req, res) => {
  const { runId } = req.body;
  
  if (!runId) {
    return res.status(400).json({ 
      error: 'runId is required',
      message: 'Please provide an Apify run ID' 
    });
  }

  logger.info(`🚀 Triggering aggregation for run: ${runId}`);

  // Set timeout for long-running process
  res.setTimeout(300000); // 5 minutes

  const scriptPath = path.join(__dirname, '..', 'backend', 'apify-to-airtable-top3.js');
  const command = `node "${scriptPath}" "" "${runId}"`;
  
  logger.info(`Executing command: ${command}`);
  
  exec(command, { timeout: 240000 }, (error, stdout, stderr) => {
    if (error) {
      logger.error('❌ Aggregation failed:', error);
      return res.status(500).json({
        error: 'Aggregation failed',
        message: error.message,
        stderr: stderr
      });
    }
    
    if (stderr) {
      logger.warn('⚠️ Stderr output:', stderr);
    }
    
    logger.info('✅ Aggregation completed successfully');
    
    // Parse results from stdout if possible
    const lines = stdout.split('\n');
    const successLine = lines.find(line => line.includes('Records created in Airtable:'));
    const created = successLine ? successLine.match(/(\d+)/)?.[1] : 'unknown';
    
    res.json({
      success: true,
      message: 'Aggregation completed successfully',
      recordsCreated: created,
      output: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

// GET /api/aggregation/status
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'news-aggregation',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    configuration: {
      airtableConfigured: !!process.env.AIRTABLE_API_KEY,
      apifyConfigured: !!process.env.APIFY_API_TOKEN,
      baseId: process.env.AIRTABLE_BASE_ID ? 'configured' : 'missing',
      tableName: process.env.AIRTABLE_TABLE_NAME || 'not-set'
    }
  });
});

module.exports = router;
// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/articles', articlesRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'physical-security-news-aggregator'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? err.message : 'Something went wrong'
  });
});

// CRITICAL FIX: Bind to 0.0.0.0 instead of localhost
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('Server is listening, starting scheduler...');
  
  // Start the scheduler after server is listening
  scheduler.start()
    .then(() => {
      logger.info('Application fully initialized');
    })
    .catch(err => {
      logger.error('Failed to start scheduler:', err);
      process.exit(1);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;