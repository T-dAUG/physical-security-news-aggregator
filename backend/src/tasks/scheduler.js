const cron = require('node-cron');
const logger = require('../utils/logger');
const contentService = require('../services/contentService');
const airtableService = require('../services/airtableService');
const cacheService = require('../services/cacheService');

class ProductionScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.config = this.getSchedulerConfig();
  }

  /**
   * Get scheduler configuration based on environment
   */
  getSchedulerConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const enableScheduler = process.env.ENABLE_SCHEDULER;
    const schedulerInstance = process.env.SCHEDULER_INSTANCE;
    const replicaId = process.env.RAILWAY_REPLICA_ID;

    // Determine if this instance should run the scheduler
    const shouldRunScheduler = this.shouldRunScheduler(
      enableScheduler, 
      schedulerInstance, 
      replicaId, 
      nodeEnv
    );

    return {
      enabled: shouldRunScheduler,
      environment: nodeEnv,
      timezone: process.env.SCHEDULER_TIMEZONE || 'UTC',
      schedules: {
        dailyScrape: process.env.CRON_DAILY_SCRAPE || (nodeEnv === 'development' ? '*/2 * * * *' : '0 6 * * *'),
        cleanup: process.env.CRON_CLEANUP || (nodeEnv === 'development' ? '*/5 * * * *' : '0 2 * * 0'),
        cacheCleanup: process.env.CRON_CACHE_CLEANUP || (nodeEnv === 'development' ? '* * * * *' : '0 * * * *')
      },
      alerts: {
        webhookUrl: process.env.ALERT_WEBHOOK_URL,
        emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        slackEnabled: process.env.SLACK_WEBHOOK_URL ? true : false
      }
    };
  }

  /**
   * Determine if this instance should run the scheduler
   */
  shouldRunScheduler(enableScheduler, schedulerInstance, replicaId, nodeEnv) {
    // Explicit disable
    if (enableScheduler === 'false') {
      logger.info('Scheduler explicitly disabled via ENABLE_SCHEDULER=false');
      return false;
    }

    // Explicit enable
    if (enableScheduler === 'true') {
      logger.info('Scheduler explicitly enabled via ENABLE_SCHEDULER=true');
      return true;
    }

    // Dedicated scheduler instance
    if (schedulerInstance === 'true') {
      logger.info('Running as dedicated scheduler instance');
      return true;
    }

    // Railway replica logic - only run on first replica to avoid duplicates
    if (replicaId !== undefined && replicaId !== '0') {
      logger.info(`Scheduler disabled on replica ${replicaId} to prevent duplicates`);
      return false;
    }

    // Default behavior based on environment
    if (nodeEnv === 'development') {
      logger.info('Scheduler enabled in development environment');
      return true;
    }

    // Production default: disable unless explicitly enabled
    logger.info('Scheduler disabled in production (use ENABLE_SCHEDULER=true to enable)');
    return false;
  }

  /**
   * Initialize scheduler
   */
  async initialize() {
    if (!this.config.enabled) {
      logger.info('Scheduler is disabled - skipping initialization');
      return false;
    }

    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return false;
    }

    try {
      await this.validateServices();
      this.createJobs();
      this.startJobs();
      this.setupGracefulShutdown();
      
      logger.info('Scheduler initialized successfully', {
        environment: this.config.environment,
        timezone: this.config.timezone,
        schedules: this.config.schedules
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize scheduler', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate required services are available
   */
  async validateServices() {
    const checks = [];

    // Check if content service is available
    if (typeof contentService.executeFullPipeline !== 'function') {
      checks.push('contentService.executeFullPipeline not available');
    }

    // Check if airtable service is available
    if (typeof airtableService.cleanOldArticles !== 'function') {
      checks.push('airtableService.cleanOldArticles not available');
    }

    // Check if cache service is available
    if (typeof cacheService.invalidate !== 'function') {
      checks.push('cacheService.invalidate not available');
    }

    if (checks.length > 0) {
      throw new Error(`Service validation failed: ${checks.join(', ')}`);
    }

    logger.debug('All required services validated successfully');
  }

  /**
   * Create cron jobs
   */
  createJobs() {
    const jobs = [
      {
        name: 'dailyScrape',
        schedule: this.config.schedules.dailyScrape,
        handler: () => this.runDailyScrape(),
        description: 'Daily content scraping job'
      },
      {
        name: 'cleanup',
        schedule: this.config.schedules.cleanup,
        handler: () => this.runCleanup(),
        description: 'Weekly cleanup job'
      },
      {
        name: 'cacheCleanup',
        schedule: this.config.schedules.cacheCleanup,
        handler: () => this.runCacheCleanup(),
        description: 'Hourly cache cleanup job'
      }
    ];

    jobs.forEach(({ name, schedule, handler, description }) => {
      try {
        const job = cron.schedule(schedule, async () => {
          await this.executeJobSafely(name, handler);
        }, {
          scheduled: false,
          timezone: this.config.timezone
        });

        this.jobs.set(name, { job, schedule, description });
        logger.debug(`Created job: ${name} (${schedule})`, { description });
      } catch (error) {
        logger.error(`Failed to create job: ${name}`, { error: error.message, schedule });
      }
    });
  }

  /**
   * Start all jobs
   */
  startJobs() {
    let startedCount = 0;

    this.jobs.forEach((jobData, name) => {
      try {
        jobData.job.start();
        startedCount++;
        logger.info(`Started job: ${name}`, { 
          schedule: jobData.schedule,
          description: jobData.description 
        });
      } catch (error) {
        logger.error(`Failed to start job: ${name}`, { error: error.message });
      }
    });

    this.isRunning = startedCount > 0;
    logger.info(`Scheduler started with ${startedCount}/${this.jobs.size} jobs`);
  }

  /**
   * Execute job with error handling and metrics
   */
  async executeJobSafely(jobName, handler) {
    const jobId = `${jobName}-${Date.now()}`;
    const startTime = Date.now();

    logger.info(`Starting job: ${jobName}`, { jobId });

    try {
      await handler();
      const duration = Date.now() - startTime;
      
      logger.info(`Job completed successfully: ${jobName}`, {
        jobId,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`Job failed: ${jobName}`, {
        jobId,
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack
      });

      await this.sendJobFailureAlert(jobName, error, jobId);
    }
  }

  /**
   * Daily scraping job
   */
  async runDailyScrape() {
    // Get sources from environment or use defaults
    const sources = this.getScrapingSources();
    
    const result = await contentService.executeFullPipeline(sources);
    
    // Invalidate relevant caches
    await Promise.all([
      cacheService.invalidate('articles:*'),
      cacheService.invalidate('analytics:*'),
      cacheService.invalidate('categories:*'),
      cacheService.invalidate('sources:*')
    ]);

    logger.info('Daily scrape completed', { stats: result.stats });
    return result;
  }

  /**
   * Get scraping sources configuration
   */
  getScrapingSources() {
    // Allow configuration via environment variables
    if (process.env.SCRAPING_SOURCES) {
      try {
        return JSON.parse(process.env.SCRAPING_SOURCES);
      } catch (error) {
        logger.warn('Invalid SCRAPING_SOURCES JSON, using defaults');
      }
    }

    // Default sources
    return [
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com',
        actorId: 'apify/web-scraper',
        maxPages: parseInt(process.env.SCRAPE_MAX_PAGES) || 10,
        config: {
          pageWaitMs: 3000,
          maxCrawlingDepth: 2
        }
      },
      {
        name: 'BBC News',
        url: 'https://www.bbc.com/news',
        actorId: 'apify/web-scraper',
        maxPages: parseInt(process.env.SCRAPE_MAX_PAGES) || 15,
        config: {
          pageWaitMs: 2000,
          maxCrawlingDepth: 1
        }
      },
      {
        name: 'Reuters',
        url: 'https://www.reuters.com',
        actorId: 'apify/web-scraper',
        maxPages: parseInt(process.env.SCRAPE_MAX_PAGES) || 12,
        config: {
          pageWaitMs: 2500,
          maxCrawlingDepth: 2
        }
      }
    ];
  }

  /**
   * Cleanup job
   */
  async runCleanup() {
    const retentionDays = parseInt(process.env.ARTICLE_RETENTION_DAYS) || 90;
    
    // Clean old articles
    const deletedCount = await airtableService.cleanOldArticles(retentionDays);
    
    // Clear old cache entries
    await this.clearOldCacheEntries();

    logger.info('Cleanup completed', { 
      deletedArticles: deletedCount,
      retentionDays 
    });

    return { deletedArticles: deletedCount };
  }

  /**
   * Cache cleanup job
   */
  async runCacheCleanup() {
    await this.clearOldCacheEntries();
    logger.debug('Cache cleanup completed');
  }

  /**
   * Clear old cache entries
   */
  async clearOldCacheEntries() {
    const patterns = ['analytics:*', 'articles:stats:*'];
    
    await Promise.all(
      patterns.map(pattern => cacheService.invalidate(pattern))
    );

    logger.debug('Old cache entries cleared', { patterns });
  }

  /**
   * Send job failure alert
   */
  async sendJobFailureAlert(jobName, error, jobId) {
    const alertData = {
      job: jobName,
      jobId,
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      server: process.env.RAILWAY_SERVICE_NAME || 'scheduler'
    };

    logger.error('Job failure alert', alertData);

    try {
      // Send webhook alert if configured
      if (this.config.alerts.webhookUrl) {
        const fetch = require('node-fetch');
        await fetch(this.config.alerts.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData)
        });
      }

      // Add more alert channels as needed (Slack, email, etc.)
      if (this.config.alerts.slackEnabled && process.env.SLACK_WEBHOOK_URL) {
        // Implement Slack notification
      }

    } catch (alertError) {
      logger.error('Failed to send job failure alert', { 
        error: alertError.message,
        originalJobName: jobName 
      });
    }
  }

  /**
   * Manual job triggers for admin/testing
   */
  async triggerJob(jobName) {
    if (!this.config.enabled) {
      throw new Error('Scheduler is disabled');
    }

    logger.info(`Manually triggering job: ${jobName}`);

    switch (jobName) {
      case 'dailyScrape':
        return await this.executeJobSafely('dailyScrape', () => this.runDailyScrape());
      case 'cleanup':
        return await this.executeJobSafely('cleanup', () => this.runCleanup());
      case 'cacheCleanup':
        return await this.executeJobSafely('cacheCleanup', () => this.runCacheCleanup());
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      environment: this.config.environment,
      timezone: this.config.timezone,
      jobs: Array.from(this.jobs.entries()).map(([name, data]) => ({
        name,
        schedule: data.schedule,
        description: data.description,
        isRunning: data.job && typeof data.job.getStatus === 'function' ? data.job.getStatus() : 'unknown'
      })),
      config: {
        schedules: this.config.schedules,
        alerts: {
          webhookConfigured: !!this.config.alerts.webhookUrl,
          emailEnabled: this.config.alerts.emailEnabled,
          slackEnabled: this.config.alerts.slackEnabled
        }
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.isRunning) {
      logger.info('Scheduler is not running');
      return;
    }

    logger.info('Shutting down scheduler...');

    const shutdownPromises = Array.from(this.jobs.entries()).map(([name, data]) => {
      return new Promise((resolve) => {
        try {
          data.job.stop();
          logger.info(`Stopped job: ${name}`);
          resolve();
        } catch (error) {
          logger.error(`Error stopping job: ${name}`, { error: error.message });
          resolve(); // Don't block shutdown on individual job errors
        }
      });
    });

    await Promise.all(shutdownPromises);

    this.jobs.clear();
    this.isRunning = false;
    logger.info('Scheduler shutdown complete');
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownHandler = async (signal) => {
      logger.info(`Received ${signal}, shutting down scheduler gracefully`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }
}

module.exports = new ProductionScheduler();