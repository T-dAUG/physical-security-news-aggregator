#!/usr/bin/env node

/**
 * CORRECTED: Apify Google Search Results → Airtable
 * Fixed field mapping to match actual Airtable structure
 */

const axios = require('axios');
require('dotenv').config();

const config = {
  apify: {
    token: process.env.APIFY_API_TOKEN
  },
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME
  }
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

  async getLatestRun(actorId) {
    const url = `${this.baseUrl}/acts/${actorId}/runs?limit=1`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.data.items[0];
  }

  async getRun(runId) {
    const url = `${this.baseUrl}/actor-runs/${runId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.data;
  }

  async getDatasetItems(datasetId) {
    const url = `${this.baseUrl}/datasets/${datasetId}/items`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` }
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
      'Content-Type': 'application/json'
    };
  }

  // FIXED: Map to correct Airtable field names
  mapToAirtableFields(data) {
    // Determine category based on search term or content
    let category = 'News'; // Default
    const searchTerm = (data.searchTerm || '').toLowerCase();
    
    if (searchTerm.includes('policy') || searchTerm.includes('law') || searchTerm.includes('regulation')) {
      category = 'Policy';
    } else if (searchTerm.includes('statistic') || searchTerm.includes('data') || searchTerm.includes('fbi')) {
      category = 'Stats';
    } else if (searchTerm.includes('technology') || searchTerm.includes('detection') || searchTerm.includes('security tech')) {
      category = 'Tech';
    } else if (searchTerm.includes('violence') || searchTerm.includes('crime') || searchTerm.includes('shooting')) {
      category = 'News';
    }

    // Extract domain for source
    let source = '';
    try {
      if (data.url) {
        const urlObj = new URL(data.url);
        source = urlObj.hostname;
      }
    } catch (e) {
      source = data.source || '';
    }

    return {
      'Title': data.title || 'Untitled Article',
      'Summary': data.description || data.summary || '',
      'Category': category,
      'source': source,
      'link': data.url || '',
      'date published': new Date().toISOString().split('T')[0] // Today's date
    };
  }

  async createRecord(data) {
    const airtableFields = this.mapToAirtableFields(data);
    
    const response = await axios.post(this.baseUrl, {
      fields: airtableFields
    }, { headers: this.headers });
    
    return response.data;
  }

  async createBatch(records) {
    const airtableRecords = records.map(item => ({
      fields: this.mapToAirtableFields(item)
    }));

    const response = await axios.post(this.baseUrl, {
      records: airtableRecords
    }, { headers: this.headers });
    
    return response.data;
  }
}

// Process Google Search Results (same as before)
function processGoogleSearchResults(searchPages) {
  const articles = [];
  
  console.log(`🔍 Processing ${searchPages.length} search result pages...`);
  
  searchPages.forEach((page, pageIndex) => {
    const searchTerm = page.searchQuery?.term || 'Unknown';
    const organicResults = page.organicResults || [];
    
    console.log(`   📄 Page ${pageIndex + 1}: "${searchTerm}" → ${organicResults.length} results`);
    
    organicResults.forEach((result, resultIndex) => {
      // Skip if missing essential data
      if (!result.url || !result.title) {
        console.log(`     ⚠️  Skipping result ${resultIndex + 1}: Missing URL or title`);
        return;
      }
      
      articles.push({
        searchTerm: searchTerm.replace(/"/g, ''), // Remove quotes
        url: result.url,
        title: result.title,
        description: result.description || '',
        summary: result.description ? result.description.substring(0, 200) + '...' : '',
        position: result.position,
        source: result.displayedUrl || ''
      });
    });
  });
  
  console.log(`✅ Extracted ${articles.length} individual articles`);
  return articles;
}

async function processApifyRun(actorId, runId) {
  console.log('🚀 Starting Apify → Airtable transfer (CORRECTED VERSION)...\n');
  
  validateConfig();
  
  const apify = new ApifyClient(config.apify.token);
  const airtable = new AirtableClient(
    config.airtable.apiKey,
    config.airtable.baseId,
    config.airtable.tableName
  );

  try {
    // Get the run
    let run;
    if (runId) {
      console.log(`📥 Fetching specific run: ${runId}`);
      run = await apify.getRun(runId);
    } else if (actorId) {
      console.log(`📥 Fetching latest run for actor: ${actorId}`);
      run = await apify.getLatestRun(actorId);
    } else {
      throw new Error('Either actorId or runId must be provided');
    }

    console.log(`✅ Found run: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Started: ${run.startedAt}`);
    console.log(`   Finished: ${run.finishedAt || 'Still running'}`);

    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Run did not succeed. Status: ${run.status}`);
    }

    // Get search result pages
    console.log('\n📊 Fetching search result pages...');
    const searchPages = await apify.getDatasetItems(run.defaultDatasetId);
    
    if (!searchPages || searchPages.length === 0) {
      console.log('⚠️  No search pages found');
      return;
    }

    console.log(`✅ Found ${searchPages.length} search result pages`);

    // Extract individual articles from organic results
    const articles = processGoogleSearchResults(searchPages);
    
    if (articles.length === 0) {
      console.log('⚠️  No articles extracted from search results');
      return;
    }

    // Send to Airtable in batches
    console.log('\n📤 Sending articles to Airtable...');
    console.log('🗺️ Field Mapping:');
    console.log('   • Article URL → link');
    console.log('   • Article Title → Title');
    console.log('   • Description → Summary');
    console.log('   • Search Term → Category (auto-detected)');
    console.log('   • Domain → source');
    console.log('   • Today → date published\n');
    
    const batchSize = 10;
    let totalCreated = 0;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      try {
        if (i > 0) {
          console.log('   ⏳ Waiting 200ms...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const result = await airtable.createBatch(batch);
        totalCreated += result.records.length;
        
        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records created`);
        
      } catch (error) {
        console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1} failed, trying individual records...`);
        
        // Try individual records for failed batch
        for (const article of batch) {
          try {
            await airtable.createRecord(article);
            totalCreated++;
            console.log(`     ✅ Individual: ${article.title.substring(0, 50)}...`);
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (individualError) {
            console.log(`     ❌ Failed: ${article.title.substring(0, 50)}... - ${individualError.message}`);
          }
        }
      }
    }

    // Summary
    console.log('\n🎉 Transfer completed!');
    console.log(`   📊 Search pages processed: ${searchPages.length}`);
    console.log(`   📄 Articles extracted: ${articles.length}`);
    console.log(`   ✅ Records created in Airtable: ${totalCreated}`);
    console.log(`   📈 Success rate: ${Math.round((totalCreated/articles.length)*100)}%`);

    // Show sample of what was transferred
    if (totalCreated > 0) {
      console.log('\n📋 Sample articles transferred:');
      articles.slice(0, 3).forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`);
        console.log(`      🔗 ${article.url}`);
        console.log(`      🔍 Search: "${article.searchTerm}"`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const actorId = args[0];
  const runId = args[1];

  if (!actorId && !runId) {
    console.log(`
📋 CORRECTED: Apify Google Search → Airtable Transfer

This version uses the correct field names for your Airtable:
• Title → Title
• Summary → Summary  
• Category → Auto-detected from search terms
• source → Domain extracted from URL
• link → Article URL
• date published → Today's date

Usage:
  node apify-to-airtable-CORRECTED.js [ACTOR_ID] [RUN_ID]

Examples:
  node apify-to-airtable-CORRECTED.js apify~google-search-scraper
  node apify-to-airtable-CORRECTED.js "" uKrgjRLhDlmTBim7u
`);
    process.exit(1);
  }

  processApifyRun(actorId, runId);
}

if (require.main === module) {
  main();
}