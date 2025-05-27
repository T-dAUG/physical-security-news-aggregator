const cron = require('node-cron');
const logger = require('../utils/logger');
const contentService = require('../services/contentService');
const airtableService = require('../services/airtableService');
const cacheService = require('../services/cacheService');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler...');
    
  // Daily scraping job at 6 AM
  const dailyScrapeJob = cron.schedule('0 6 * * *', async () => {
    await this.runDailyScrape();
  }, {
    scheduled: false,
    timezone: 'UTC'
  });

  // Weekly cleanup job every Sunday at 2 AM
  const cleanupJob = cron.schedule('0 2 * * 0', async () => {
    await this.runCleanup();
  }, {
    scheduled: false,
    timezone: 'UTC'
  });

    // Cache invalidation job every hour
    const cacheCleanupJob = cron.schedule('0 * * * *', async () => {
      await this.runCacheCleanup();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Start all jobs
    dailyScrapeJob.start();
    cleanupJob.start();
    cacheCleanupJob.start();

    // Store job references
    this.jobs.set('dailyScrape', dailyScrapeJob);
    this.jobs.set('cleanup', cleanupJob);
    this.jobs.set('cacheCleanup', cacheCleanupJob);

    this.isRunning = true;
    logger.info('Scheduler started successfully');
    logger.info(`Daily scrape scheduled for: ${process.env.CRON_DAILY_SCRAPE || '0 6 * * *'}`);
    logger.info(`Cleanup scheduled for: ${process.env.CRON_CLEANUP || '0 2 * * *'}`);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  async runDailyScrape() {
    const startTime = Date.now();
    logger.info('Starting daily scrape job');

    try {
      // Define sources to scrape
      const sources = [
        {
          name: 'TechCrunch',
          url: 'https://techcrunch.com',
          actorId: 'apify/web-scraper',
          maxPages: 10,
          config: {
            pageWaitMs: 3000,
            maxCrawlingDepth: 2
          }
        },
        {
          name: 'BBC News',
          url: 'https://www.bbc.com/news',
          actorId: 'apify/web-scraper',
          maxPages: 15,
          config: {
            pageWaitMs: 2000,
            maxCrawlingDepth: 1
          }
        },
        {
          name: 'Reuters',
          url: 'https://www.reuters.com',
          actorId: 'apify/web-scraper',
          maxPages: 12,
          config: {
            pageWaitMs: 2500,
            maxCrawlingDepth: 2
          }
        }
      ];

      const result = await contentService.executeFullPipeline(sources);
      const duration = Date.now() - startTime;

      logger.info('Daily scrape job completed successfully', {
        duration: `${duration}ms`,
        stats: result.stats
      });

      // Invalidate relevant caches
      await cacheService.invalidate('articles:*');
      await cacheService.invalidate('analytics:*');
      await cacheService.invalidate('categories:*');
      await cacheService.invalidate('sources:*');

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Daily scrape job failed', {
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack
      });

      // Send alert notification
      await this.sendJobFailureAlert('Daily Scrape', error);
    }
  }

  async runCleanup() {
    const startTime = Date.now();
    logger.info('Starting cleanup job');

    try {
      // Clean old articles (older than 90 days)
      const deletedCount = await airtableService.cleanOldArticles(90);
      
      // Clear old cache entries
      await this.clearOldCacheEntries();

      const duration = Date.now() - startTime;
      logger.info('Cleanup job completed successfully', {
        deletedArticles: deletedCount,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Cleanup job failed', {
        error: error.message,
        duration: `${duration}ms`
      });

      await this.sendJobFailureAlert('Cleanup', error);
    }
  }

  async runCacheCleanup() {
    try {
      logger.debug('Running cache cleanup');
      
      // This would depend on your Redis setup
      // For now, just log that it's running
      logger.debug('Cache cleanup completed');

    } catch (error) {
      logger.error('Cache cleanup failed', error);
    }
  }

  async clearOldCacheEntries() {
    try {
      // Clear analytics cache to ensure fresh data
      await cacheService.invalidate('analytics:*');
      
      // Clear old article caches
      await cacheService.invalidate('articles:stats:*');
      
      logger.debug('Old cache entries cleared');
    } catch (error) {
      logger.warn('Failed to clear old cache entries', error);
    }
  }

  async sendJobFailureAlert(jobName, error) {
    try {
      // Implement your preferred notification method
      // This could be email, Slack, Discord, webhook, etc.
      
      const alertData = {
        job: jobName,
        error: error.message,
        timestamp: new Date().toISOString(),
        server: process.env.NODE_ENV || 'development'
      };

      logger.error('Job failure alert', alertData);

      // Example: Send to webhook
      // await axios.post(process.env.ALERT_WEBHOOK_URL, alertData);

    } catch (alertError) {
      logger.error('Failed to send job failure alert', alertError);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      nextRuns: {
        dailyScrape: this.getNextRunTime('0 6 * * *'),
        cleanup: this.getNextRunTime('0 2 * * 0')
      }
    };
  }

  getNextRunTime(cronExpression) {
    try {
      // This is a simplified version - you'd want to use a proper cron parser
      return 'Next run time calculation would go here';
    } catch (error) {
      return 'Unable to calculate next run time';
    }
  }

  // Manual job triggers for testing/admin purposes
  async triggerDailyScrape() {
    logger.info('Manually triggering daily scrape');
    await this.runDailyScrape();
  }

  async triggerCleanup() {
    logger.info('Manually triggering cleanup');
    await this.runCleanup();
  }
}

module.exports = new Scheduler();