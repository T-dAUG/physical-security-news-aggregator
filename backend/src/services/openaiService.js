const OpenAI = require('openai');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
      this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
      this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
  }

  async generateSummary(content, maxLength = 200) {
    try {
      const prompt = `Summarize the following article in ${maxLength} characters or less. Focus on the key points and main message:\n\n${content}`;
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional news summarizer. Create concise, informative summaries that capture the essence of articles.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const summary = response.choices[0].message.content.trim();
      logger.debug('Generated summary', { 
        originalLength: content.length, 
        summaryLength: summary.length 
      });

      return summary;
    } catch (error) {
      logger.error('OpenAI summary generation failed:', error);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  async extractKeywords(content, maxKeywords = 10) {
    try {
      const prompt = `Extract the ${maxKeywords} most important keywords from this article. Return only the keywords separated by commas:\n\n${content}`;
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a keyword extraction expert. Extract only the most relevant and important keywords from articles.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
      });

      const keywordsString = response.choices[0].message.content.trim();
      const keywords = keywordsString
        .split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 2)
        .slice(0, maxKeywords);

      logger.debug('Extracted keywords', { 
        count: keywords.length, 
        keywords: keywords.join(', ') 
      });

      return keywords;
    } catch (error) {
      logger.error('OpenAI keyword extraction failed:', error);
      throw new Error(`Keyword extraction failed: ${error.message}`);
    }
  }

  async categorizeArticle(content, categories = []) {
    try {
      const categoriesList = categories.length > 0 
        ? categories.join(', ') 
        : 'technology, business, health, sports, politics, entertainment, general';
      
      const prompt = `Categorize this article into one of these categories: ${categoriesList}. Return only the category name:\n\n${content}`;
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a content categorization expert. Categorize articles accurately based on their main topic.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 20,
        temperature: 0.1,
      });

      const category = response.choices[0].message.content.trim().toLowerCase();
      
      logger.debug('Categorized article', { category });
      return category;
    } catch (error) {
      logger.error('OpenAI categorization failed:', error);
      return 'general'; // Fallback category
    }
  }

  async generateTags(content, maxTags = 5) {
    try {
      const prompt = `Generate ${maxTags} relevant hashtags for this article. Return only the hashtags without the # symbol, separated by commas:\n\n${content}`;
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a social media expert. Generate relevant, engaging hashtags for articles.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.5,
      });

      const tagsString = response.choices[0].message.content.trim();
      const tags = tagsString
        .split(',')
        .map(tag => tag.trim().toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 1)
        .slice(0, maxTags);

      return tags;
    } catch (error) {
      logger.error('OpenAI tag generation failed:', error);
      return []; // Return empty array on failure
    }
  }

  async checkContentQuality(content) {
    try {
      const prompt = `Rate the quality of this article content on a scale of 1-10 considering factors like informativeness, clarity, and completeness. Return only the number:\n\n${content}`;
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a content quality assessor. Rate articles objectively based on their informational value and clarity.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      const qualityScore = parseInt(response.choices[0].message.content.trim());
      return isNaN(qualityScore) ? 5 : Math.max(1, Math.min(10, qualityScore));
    } catch (error) {
      logger.error('OpenAI quality check failed:', error);
      return 5; // Default neutral score
    }
  }
}

module.exports = new OpenAIService();