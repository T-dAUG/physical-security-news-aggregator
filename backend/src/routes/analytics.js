const express = require('express');
const { query, validationResult } = require('express-validator');
const airtableService = require('../services/airtableService');
const cacheService = require('../services/cacheService');
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

// GET /api/analytics/overview - Get analytics overview
router.get('/overview',
  [
    query('timeframe').optional().isIn(['1d', '7d', '30d', '90d'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { timeframe = '7d' } = req.query;
      const cacheKey = cacheService.generateKey('analytics', 'overview', timeframe);
      
      let analytics = await cacheService.get(cacheKey);

      if (!analytics) {
        analytics = await airtableService.getAnalytics(timeframe);
        // Cache for 10 minutes
        await cacheService.set(cacheKey, analytics, parseInt(process.env.REDIS_TTL_ANALYTICS) || 1800);
      }

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Analytics overview fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics'
      });
    }
  }
);

// GET /api/analytics/trends - Get trending topics
router.get('/trends',
  [
    query('timeframe').optional().isIn(['1d', '7d', '30d']),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { timeframe = '7d', limit = 10 } = req.query;
      const cacheKey = cacheService.generateKey('analytics', 'trends', timeframe, limit);
      
      let trends = await cacheService.get(cacheKey);

      if (!trends) {
        const analytics = await airtableService.getAnalytics(timeframe);
        
        // Calculate trends based on category frequency
        trends = Object.entries(analytics.byCategory)
          .map(([category, count]) => ({
            category,
            count,
            percentage: ((count / analytics.totalArticles) * 100).toFixed(1)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, parseInt(limit));

        // Cache for 15 minutes
        await cacheService.set(cacheKey, trends, 900);
      }

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      logger.error('Trends fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trends'
      });
    }
  }
);

// GET /api/analytics/daily - Get daily article counts
router.get('/daily',
  [
    query('days').optional().isInt({ min: 1, max: 90 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const cacheKey = cacheService.generateKey('analytics', 'daily', days);
      
      let dailyData = await cacheService.get(cacheKey);

      if (!dailyData) {
        const timeframe = `${days}d`;
        const analytics = await airtableService.getAnalytics(timeframe);
        
        dailyData = Object.entries(analytics.dailyCount)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Cache for 30 minutes
        await cacheService.set(cacheKey, dailyData, 1800);
      }

      res.json({
        success: true,
        data: dailyData
      });

    } catch (error) {
      logger.error('Daily analytics fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch daily analytics'
      });
    }
  }
);

module.exports = router;