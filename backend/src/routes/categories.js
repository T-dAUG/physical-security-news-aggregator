const express = require('express');
const airtableService = require('../services/airtableService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    let categories = await cacheService.get(cacheKey);

    if (!categories) {
      categories = await airtableService.getCategories();
      // Cache for 30 minutes
      await cacheService.set(cacheKey, categories, parseInt(process.env.REDIS_TTL_CATEGORIES) || 600);
    }

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Categories fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// GET /api/categories/stats - Get category statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    const cacheKey = cacheService.generateKey('categories', 'stats', timeframe);
    
    let stats = await cacheService.get(cacheKey);

    if (!stats) {
      const analytics = await airtableService.getAnalytics(timeframe);
      stats = analytics.byCategory;
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, stats, parseInt(process.env.REDIS_TTL_ANALYTICS) || 1800);
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Category stats fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category statistics'
    });
  }
});

module.exports = router;