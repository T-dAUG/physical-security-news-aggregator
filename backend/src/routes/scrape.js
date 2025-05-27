const express = require('express');
const { body, validationResult } = require('express-validator');
const contentService = require('../services/contentService');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// POST /api/scrape/manual - Manual scrape trigger
router.post('/manual',
  [
    body('sources').optional().isArray(),
    body('sources.*.name').if(body('sources').exists()).isString().trim().notEmpty(),
    body('sources.*.url').if(body('sources').exists()).isURL(),
    body('sources.*.actorId').if(body('sources').exists()).isString().trim().notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      logger.info('Manual scrape initiated');
      
      const { sources } = req.body;
      
      // Use default sources if none provided
      const defaultSources = [
        {
          name: 'TechCrunch',
          url: 'https://techcrunch.com',
          actorId: 'apify/web-scraper',
          maxPages: 5,
          config: {
            pageWaitMs: 3000
          }
        }
      ];

      const sourcesToScrape = sources || defaultSources;
      
      // Start the pipeline (don't wait for completion)
      contentService.executeFullPipeline(sourcesToScrape)
        .then(result => {
          logger.info('Manual scrape completed successfully', result.stats);
        })
        .catch(error => {
          logger.error('Manual scrape failed:', error);
        });

      res.json({
        success: true,
        message: 'Scrape job started',
        sources: sourcesToScrape.length
      });

    } catch (error) {
      logger.error('Manual scrape initiation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start scrape job'
      });
    }
  }
);

// GET /api/scrape/status - Get scraping status
router.get('/status', async (req, res) => {
  try {
    // This would typically check a job queue or database for status
    // For now, return a simple status
    res.json({
      success: true,
      data: {
        isRunning: false, // You'd check actual status here
        lastRun: new Date().toISOString(),
        nextScheduled: '06:00:00', // 6 AM
        status: 'idle'
      }
    });

  } catch (error) {
    logger.error('Failed to get scrape status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scrape status'
    });
  }
});

module.exports = router;