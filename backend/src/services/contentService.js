const { ApifyClient } = require('apify-client');
const logger = require('../utils/logger');
const openaiService = require('./openaiService');
const airtableService = require('./airtableService');
const { validateArticle } = require('../utils/validators');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class ContentService {
  constructor() {
    this.apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || 'your-apify-token-here'
  });
    this.maxRetries = parseInt(process.env.SCRAPING_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.SCRAPING_RETRY_DELAY) || 2000;
    this.batchSize = parseInt(process.env.SCRAPING_BATCH_SIZE) || 5;
  }

  async executeWithRetry(operation, context = '', maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          logger.info(`${context} - Succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        logger.warn(`${context} - Attempt ${attempt}/${maxRetries} failed:`, {
          error: error.message,
          stack: error.stack
        });
        
        if (attempt === maxRetries) {
          logger.error(`${context} - All ${maxRetries} attempts failed`, {
            error: error.message
          });
          throw error;
        }
        
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  async scrapeArticles(sources = []) {
    logger.logPipelineStep('Article Scraping', 'started', { 
      sourcesCount: sources.length 
    });

    const allArticles = [];
    const startTime = Date.now();

    try {
      for (const source of sources) {
        logger.info(`Scraping source: ${source.name}`);
        
        const articles = await this.executeWithRetry(
          () => this.scrapeFromSource(source),
          `Scraping ${source.name}`
        );
        
        allArticles.push(...articles);
        logger.info(`Scraped ${articles.length} articles from ${source.name}`);
      }

      const processingTime = Date.now() - startTime;
      logger.logScrapeJob('All Sources', allArticles.length, processingTime);
      
      return this.deduplicateArticles(allArticles);
    } catch (error) {
      logger.error('Article scraping failed:', error);
      throw error;
    }
  }

  async scrapeFromSource(source) {
    const input = {
      startUrls: [{ url: source.url }],
      maxPagesPerCrawl: source.maxPages || 10,
      ...source.config
    };

    const run = await this.apifyClient.actor(source.actorId).call(input);
    const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
    
    return items.map(item => this.normalizeArticle(item, source));
  }

  normalizeArticle(rawArticle, source) {
    return {
      title: rawArticle.title || rawArticle.headline || '',
      content: rawArticle.content || rawArticle.description || '',
      url: rawArticle.url || rawArticle.link || '',
      publishedAt: rawArticle.publishedAt || rawArticle.date || new Date().toISOString(),
      source: source.name,
      category: this.categorizeArticle(rawArticle),
      keywords: this.extractKeywords(rawArticle),
      rawData: rawArticle
    };
  }

  categorizeArticle(article) {
    const content = `${article.title} ${article.content}`.toLowerCase();
    const categories = {
      technology: ['tech', 'ai', 'software', 'digital', 'computer'],
      business: ['business', 'finance', 'economy', 'market', 'company'],
      health: ['health', 'medical', 'doctor', 'hospital', 'treatment'],
      sports: ['sports', 'game', 'team', 'player', 'match'],
      politics: ['politics', 'government', 'election', 'policy', 'law']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  extractKeywords(article) {
    const text = `${article.title} ${article.content}`.toLowerCase();
    const words = text.match(/\b\w{4,}\b/g) || [];
    const frequency = {};
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  deduplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = `${article.title}-${article.url}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async processWithOpenAI(articles) {
    logger.logPipelineStep('OpenAI Processing', 'started', {
      articlesCount: articles.length
    });

    const processedArticles = [];
    const batches = this.createBatches(articles, this.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} articles)`);

      const batchResults = await Promise.allSettled(
        batch.map(article => this.processArticleWithOpenAI(article))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedArticles.push(result.value);
        } else {
          logger.error(`Failed to process article: ${batch[index].title}`, {
            error: result.reason.message
          });
        }
      });

      // Rate limiting delay between batches
      if (i < batches.length - 1) {
        await this.delay(1000);
      }
    }

    logger.logPipelineStep('OpenAI Processing', 'completed', {
      processedCount: processedArticles.length,
      failedCount: articles.length - processedArticles.length
    });

    return processedArticles;
  }

  async processArticleWithOpenAI(article) {
    try {
      const summary = await this.executeWithRetry(
        () => openaiService.generateSummary(article.content),
        `OpenAI processing for article: ${article.title}`
      );

      const enhancedKeywords = await this.executeWithRetry(
        () => openaiService.extractKeywords(article.content),
        `Keyword extraction for article: ${article.title}`
      );

      return {
        ...article,
        summary,
        keywords: [...new Set([...article.keywords, ...enhancedKeywords])],
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`OpenAI processing failed for article: ${article.title}`, error);
      return {
        ...article,
        summary: article.content.substring(0, 200) + '...',
        processedAt: new Date().toISOString(),
        processingError: error.message
      };
    }
  }

  async saveToAirtable(articles) {
    logger.logPipelineStep('Airtable Storage', 'started', {
      articlesCount: articles.length
    });

    const validArticles = [];
    const invalidArticles = [];

    // Validate articles first
    articles.forEach(article => {
      try {
        validateArticle(article);
        validArticles.push(article);
      } catch (error) {
        logger.warn(`Article validation failed: ${article.title}`, {
          error: error.message
        });
        invalidArticles.push({ article, error: error.message });
      }
    });

    if (invalidArticles.length > 0) {
      logger.warn(`${invalidArticles.length} articles failed validation`);
    }

    // Save valid articles in batches
    const savedArticles = [];
    const batches = this.createBatches(validArticles, 10); // Airtable batch limit

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Saving batch ${i + 1}/${batches.length} to Airtable`);

      try {
        const saved = await this.executeWithRetry(
          () => airtableService.createArticles(batch),
          `Airtable batch save ${i + 1}`
        );
        savedArticles.push(...saved);
      } catch (error) {
        logger.error(`Failed to save batch ${i + 1} to Airtable`, error);
      }
    }

    logger.logPipelineStep('Airtable Storage', 'completed', {
      savedCount: savedArticles.length,
      failedCount: validArticles.length - savedArticles.length
    });

    return savedArticles;
  }

  async executeFullPipeline(sources) {
    const pipelineStartTime = Date.now();
    logger.info('Starting full content pipeline', {
      sourcesCount: sources.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Step 1: Scrape articles
      const rawArticles = await this.scrapeArticles(sources);
      
      if (rawArticles.length === 0) {
        logger.warn('No articles found during scraping');
        return { success: true, articles: [], message: 'No new articles found' };
      }

      // Step 2: Process with OpenAI
      const processedArticles = await this.processWithOpenAI(rawArticles);
      
      // Step 3: Save to Airtable
      const savedArticles = await this.saveToAirtable(processedArticles);

      const totalTime = Date.now() - pipelineStartTime;
      
      logger.info('Content pipeline completed successfully', {
        duration: `${totalTime}ms`,
        scraped: rawArticles.length,
        processed: processedArticles.length,
        saved: savedArticles.length
      });

      return {
        success: true,
        articles: savedArticles,
        stats: {
          scraped: rawArticles.length,
          processed: processedArticles.length,
          saved: savedArticles.length,
          duration: totalTime
        }
      };

    } catch (error) {
      const totalTime = Date.now() - pipelineStartTime;
      logger.error('Content pipeline failed', {
        error: error.message,
        duration: `${totalTime}ms`,
        stack: error.stack
      });

      // Send failure notification if configured
      await this.sendFailureAlert(error);
      
      throw error;
    }
  }

  async sendFailureAlert(error) {
    try {
      // Implement your preferred notification method
      // Email, Slack, webhook, etc.
      logger.info('Failure alert would be sent here', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } catch (alertError) {
      logger.error('Failed to send failure alert', alertError);
    }
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ContentService();