#!/usr/bin/env node

/**
 * Apify → Airtable Transfer Script (INDIVIDUAL PROCESSING VERSION)
 * Processes records one at a time to avoid batch validation issues
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
  console.log(`🔍 Processing ${searchPages.length} search result pages...`);
  
  const articles = [];
  
  searchPages.forEach(page => {
    const searchTerm = page.searchQuery?.term || '';
    const results = page.organicResults || [];
    
    console.log(`   📄 Page ${searchPages.indexOf(page) + 1}: "${searchTerm}" → ${results.length} results`);
    
    results.forEach(result => {
      if (result.url && result.title) {
        articles.push({
          searchTerm,
          url: result.url,
          title: result.title,
          description: result.description || result.snippet || '',
        });
      }
    });
  });
  
  console.log(`✅ Extracted ${articles.length} individual articles`);
  return articles;
}

async function transferToAirtable(articles, airtable) {
  console.log('\n📤 Sending articles to Airtable individually...');
  console.log('🗺️ Field Mapping:');
  console.log('   • Article URL → link');
  console.log('   • Article Title → Title');
  console.log('   • Description → Summary');
  console.log('   • Search Term → Category (auto-detected)');
  console.log('   • Domain → source');
  console.log('   • Today → date published\n');
  
  let totalCreated = 0;
  let totalSkipped = 0;
  const errors = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    try {
      // Add delay every 10 records to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        console.log(`   ⏳ Processed ${i} records, pausing briefly...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
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
      
      // Show progress every 50 records
      if (i % 50 === 0 || totalCreated === 1) {
        console.log(`   ✅ Progress: ${i + 1}/${articles.length} - "${title}"`);
      }
      
      // Small delay between records
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      totalSkipped++;
      
      const errorMsg = error.response?.data?.error?.message || error.message;
      
      // Only show first 10 errors to avoid spam
      if (totalSkipped <= 10) {
        console.log(`   ❌ Skipped: "${article.title?.substring(0, 50)}..." - ${errorMsg}`);
      }
      
      // Store error for summary
      errors.push({
        title: article.title,
        error: errorMsg,
        status: error.response?.status
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
  
  if (errors.length > 0) {
    console.log('\n📋 Error Summary:');
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
  console.log('🚀 Starting Apify → Airtable transfer (INDIVIDUAL PROCESSING)...\n');
  
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

    // Process articles
    const articles = processArticles(searchPages);
    
    if (articles.length === 0) {
      console.log('⚠️ No articles extracted from search results');
      return;
    }

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