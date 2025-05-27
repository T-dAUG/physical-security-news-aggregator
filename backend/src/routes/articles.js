const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
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

// GET /api/articles - Get articles with pagination and filtering
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString().trim(),
    query('source').optional().isString().trim(),
    query('search').optional().isString().trim().isLength({ min: 2 }),
    query('sortBy').optional().isIn(['title', 'publishedAt', 'category', 'source', 'qualityScore']),
    query('sortDirection').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        source,
        search,
        sortBy = 'publishedAt',
        sortDirection = 'desc'
      } = req.query;

      // Generate cache key
      const cacheKey = cacheService.generateKey(
        'articles',
        page,
        limit,
        category || 'all',
        source || 'all',
        search || 'none',
        sortBy,
        sortDirection
      );

      // Try cache first
      let articles = await cacheService.get(cacheKey);

      if (!articles) {
        // Query from Airtable
        articles = await airtableService.getArticles({
          page: parseInt(page),
          limit: parseInt(limit),
          category,
          source,
          search,
          sortBy,
          sortDirection
        });

        // Cache for 5 minutes
        await cacheService.set(cacheKey, articles, parseInt(process.env.REDIS_TTL_ARTICLES) || 300);
      }

      res.json({
        success: true,
        data: articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: articles.length === parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Articles fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch articles'
      });
    }
  }
);

// GET /api/articles/:id - Get specific article
router.get('/:id',
  [
    param('id').isString().trim().notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = cacheService.generateKey('article', id);

      // Try cache first
      let article = await cacheService.get(cacheKey);

      if (!article) {
        article = await airtableService.getArticleById(id);
        // Cache for 10 minutes
        await cacheService.set(cacheKey, article, 600);
      }

      res.json({
        success: true,
        data: article
      });

    } catch (error) {
      logger.error(`Article fetch failed for ID ${req.params.id}:`, error);
      
      if (error.message.includes('Record not found')) {
        res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch article'
        });
      }
    }
  }
);

// POST /api/articles - Create new article (admin only)
router.post('/',
  [
    body('title').isString().trim().isLength({ min: 5, max: 200 }),
    body('content').isString().trim().isLength({ min: 50 }),
    body('url').isURL(),
    body('source').isString().trim().notEmpty(),
    body('category').isIn(['technology', 'business', 'health', 'sports', 'politics', 'entertainment', 'general']),
    body('publishedAt').isISO8601(),
    body('summary').optional().isString().trim().isLength({ max: 500 }),
    body('keywords').optional().isArray(),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const articleData = req.body;
      const createdArticles = await airtableService.createArticles([articleData]);
      
      // Invalidate relevant caches
      await cacheService.invalidate('articles:*');
      
      logger.info('Article created successfully', { id: createdArticles[0].id });
      
      res.status(201).json({
        success: true,
        data: createdArticles[0]
      });

    } catch (error) {
      logger.error('Article creation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create article'
      });
    }
  }
);

// PUT /api/articles/:id - Update article (admin only)
router.put('/:id',
  [
    param('id').isString().trim().notEmpty(),
    body('title').optional().isString().trim().isLength({ min: 5, max: 200 }),
    body('content').optional().isString().trim().isLength({ min: 50 }),
    body('url').optional().isURL(),
    body('source').optional().isString().trim().notEmpty(),
    body('category').optional().isIn(['technology', 'business', 'health', 'sports', 'politics', 'entertainment', 'general']),
    body('summary').optional().isString().trim().isLength({ max: 500 }),
    body('keywords').optional().isArray(),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedArticle = await airtableService.updateArticle(id, updates);
      
      // Invalidate relevant caches
      await cacheService.del(cacheService.generateKey('article', id));
      await cacheService.invalidate('articles:*');
      
      logger.info('Article updated successfully', { id });
      
      res.json({
        success: true,
        data: updatedArticle
      });

    } catch (error) {
      logger.error(`Article update failed for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to update article'
      });
    }
  }
);

// DELETE /api/articles/:id - Delete article (admin only)
router.delete('/:id',
  [
    param('id').isString().trim().notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      await airtableService.deleteArticle(id);
      
      // Invalidate relevant caches
      await cacheService.del(cacheService.generateKey('article', id));
      await cacheService.invalidate('articles:*');
      
      logger.info('Article deleted successfully', { id });
      
      res.json({
        success: true,
        message: 'Article deleted successfully'
      });

    } catch (error) {
      logger.error(`Article deletion failed for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete article'
      });
    }
  }
);

// GET /api/articles/stats/summary - Get article statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const cacheKey = 'articles:stats:summary';
    let stats = await cacheService.get(cacheKey);

    if (!stats) {
      const analytics = await airtableService.getAnalytics('7d');
      stats = {
        totalArticles: analytics.totalArticles,
        categoriesCount: Object.keys(analytics.byCategory).length,
        sourcesCount: Object.keys(analytics.bySource).length,
        todayCount: Object.values(analytics.dailyCount)[0] || 0
      };
      
      // Cache for 30 minutes
      await cacheService.set(cacheKey, stats, 1800);
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to fetch article stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;