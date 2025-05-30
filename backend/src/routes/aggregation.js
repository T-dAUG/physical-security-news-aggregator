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