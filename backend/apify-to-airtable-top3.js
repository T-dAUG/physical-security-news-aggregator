#!/usr/bin/env node

/**
 * Apify → Airtable Transfer Script (TOP 3 ARTICLES PER QUERY)
 * Only processes the top 3 most prominent articles from each search query
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const config = {
  apify: {
    token: process.env.APIFY_API_TOKEN,
  },
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME,
  },
};

function validateConfig() {
  const missing = [];
  if (!config.apify.token) missing.push('APIFY_API_TOKEN');
  if (!config.airtable.apiKey) missing.push('AIRTABLE_API_KEY');
  if (!config.airtable.baseId) missing.push('AIRTABLE_BASE_ID');
  if (!config.airtable.tableName) missing.push('AIRTABLE_TABLE_NAME');
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

class ApifyClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.apify.com/v2';
  }

  get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async getRun(runId) {
    const response = await axios.get(`${this.baseUrl}/actor-runs/${runId}`, {
      headers: this.headers,
    });
    return response.data.data;
  }

  async getDatasetItems(datasetId) {
    const response = await axios.get(`${this.baseUrl}/datasets/${datasetId}/items`, {
      headers: this.headers,
    });
    return response.data;
  }
}

class AirtableClient {
  constructor(apiKey, baseId, tableName) {
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.tableName = tableName;
    this.baseUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  }

  get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createRecord(fields) {
    const response = await axios.post(
      this.baseUrl,
      { fields },
      { headers: this.headers }
    );
    return response.data;
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return 'unknown';
  }
}

function determineCategory(searchTerm) {
  const term = (searchTerm || '').toLowerCase();
  
  if (term.includes('policy') || term.includes('law') || term.includes('legislation')) {
    return 'Policy';
  } else if (term.includes('statistic') || term.includes('fbi') || term.includes('data') || term.includes('report')) {
    return 'Stats';
  } else if (term.includes('technology') || term.includes('detection') || term.includes('system') || term.includes('ai') || term.includes('surveillance')) {
    return 'Tech';
  } else {
    return 'News';
  }
}

function processArticles(searchPages) {
  console.log(`🔍 Processing ${searchPages.length} search result pages (TOP 3 ONLY)...`);
  
  const articles = [];
  const MAX_ARTICLES_PER_QUERY = 3;
  
  searchPages.forEach((page, pageIndex) => {
    const searchTerm = page.searchQuery?.term || '';
    const results = page.organicResults || [];
    
    // Take only the top 3 results (most prominent/relevant)
    const topResults = results.slice(0, MAX_ARTICLES_PER_QUERY);
    
    console.log(`   📄 Page ${pageIndex + 1}: "${searchTerm}" → Taking top ${topResults.length} of ${results.length} results`);
    
    topResults.forEach((result, resultIndex) => {
      if (result.url && result.title) {
        articles.push({
          searchTerm,
          url: result.url,
          title: result.title,
          description: result.description || result.snippet || '',
          rank: resultIndex + 1, // Track the ranking (1, 2, or 3)
          queryPage: pageIndex + 1
        });
      }
    });
  });
  
  console.log(`✅ Extracted ${articles.length} TOP ARTICLES (max 3 per query)`);
  return articles;
}

async function transferToAirtable(articles, airtable) {
  console.log('\n📤 Sending TOP articles to Airtable...');
  console.log('🗺️ Field Mapping:');
  console.log('   • Article URL → link');
  console.log('   • Article Title → Title');
  console.log('   • Description → Summary');
  console.log('   • Search Term → Category (auto-detected)');
  console.log('   • Domain → source');
  console.log('   • Today → date published');
  console.log(`   • Processing ${articles.length} curated articles\n`);
  
  let totalCreated = 0;
  let totalSkipped = 0;
  const errors = [];
  const queryStats = {};

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    try {
      // Track stats per query
      if (!queryStats[article.searchTerm]) {
        queryStats[article.searchTerm] = 0;
      }

      // Process the article data
      const category = determineCategory(article.searchTerm);
      const source = extractDomain(article.url);
      const today = new Date().toISOString().split('T')[0];

      // Clean and limit field lengths
      const title = (article.title || 'Untitled Article').substring(0, 100);
      const summary = (article.description || '').substring(0, 500);

      const airtableRecord = {
        'Title': title,
        'Summary': summary,
        'Category': category,
        'source': source,
        'link': article.url,
        'date published': today
      };

      // Create the record
      const result = await airtable.createRecord(airtableRecord);
      totalCreated++;
      queryStats[article.searchTerm]++;
      
      // Show each successful article (since there are fewer now)
      console.log(`   ✅ ${totalCreated}/${articles.length}: [${category}] "${title}" (Rank #${article.rank} for "${article.searchTerm}")`);
      
      // Small delay between records
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      totalSkipped++;
      
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.log(`   ❌ Skipped: "${article.title?.substring(0, 50)}..." - ${errorMsg}`);
      
      // Store error for summary
      errors.push({
        title: article.title,
        error: errorMsg,
        status: error.response?.status,
        searchTerm: article.searchTerm
      });
      
      // Continue processing other records
      continue;
    }
  }

  // Final summary
  console.log('\n🎉 Transfer completed!');
  console.log(`   ✅ Records created in Airtable: ${totalCreated}`);
  console.log(`   ❌ Records skipped: ${totalSkipped}`);
  console.log(`   📊 Success rate: ${Math.round((totalCreated / articles.length) * 100)}%`);
  
  // Show breakdown by query
  console.log('\n📋 Articles by Query:');
  Object.entries(queryStats).forEach(([query, count]) => {
    console.log(`   • "${query}": ${count} articles added`);
  });
  
  if (errors.length > 0) {
    console.log('\n🚨 Error Summary:');
    const errorCounts = {};
    errors.forEach(err => {
      const key = `${err.status}: ${err.error}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   • ${error} (${count} times)`);
    });
  }

  return { totalCreated, totalSkipped };
}

async function main() {
  console.log('🚀 Starting Apify → Airtable transfer (TOP 3 ARTICLES PER QUERY)...\n');
  
  validateConfig();
  
  const [actorId, runId] = process.argv.slice(2);
  
  if (!runId) {
    console.error('❌ Usage: node script.js <actor-id> <run-id>');
    console.error('   Example: node script.js "" TCNglrrt0aW4HMJZB');
    process.exit(1);
  }

  const apify = new ApifyClient(config.apify.token);
  const airtable = new AirtableClient(
    config.airtable.apiKey,
    config.airtable.baseId,
    config.airtable.tableName
  );

  try {
    // Get the run data
    console.log(`📥 Fetching specific run: ${runId}`);
    const run = await apify.getRun(runId);
    console.log(`✅ Found run: ${runId}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Started: ${run.startedAt}`);
    console.log(`   Finished: ${run.finishedAt}`);
    
    if (run.status !== 'SUCCEEDED') {
      console.error(`❌ Run status is ${run.status}, expected SUCCEEDED`);
      process.exit(1);
    }

    // Fetch the dataset
    console.log('\n📊 Fetching search result pages...');
    const searchPages = await apify.getDatasetItems(run.defaultDatasetId);
    console.log(`✅ Found ${searchPages.length} search result pages`);
    
    if (searchPages.length === 0) {
      console.log('⚠️ No data found in dataset');
      return;
    }

    // Process articles (TOP 3 ONLY)
    const articles = processArticles(searchPages);
    
    if (articles.length === 0) {
      console.log('⚠️ No articles extracted from search results');
      return;
    }

    console.log(`\n🎯 Quality over quantity: Processing ${articles.length} curated articles instead of 1400+`);

    // Transfer to Airtable
    await transferToAirtable(articles, airtable);

  } catch (error) {
    console.error('\n❌ Error during transfer:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}