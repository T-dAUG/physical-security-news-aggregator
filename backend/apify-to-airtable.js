#!/usr/bin/env node

/**
 * Standalone script to transfer Apify run results to Airtable
 * Usage: node apify-to-airtable.js [ACTOR_ID] [RUN_ID]
 * 
 * Examples:
 * node apify-to-airtable.js your-actor-id
 * node apify-to-airtable.js "" specific-run-id
 * node apify-to-airtable.js your-actor-id specific-run-id
 */

const axios = require('axios');
require('dotenv').config();

// Configuration from .env file
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

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!config.apify.token) missing.push('APIFY_API_TOKEN');
  if (!config.airtable.apiKey) missing.push('AIRTABLE_API_KEY');
  if (!config.airtable.baseId) missing.push('AIRTABLE_BASE_ID');
  if (!config.airtable.tableName) missing.push('AIRTABLE_TABLE_NAME');
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }
}

// Apify API client
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

// Airtable API client
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

  async createRecord(data) {
    const response = await axios.post(this.baseUrl, {
      fields: {
        'Search Term': data.searchTerm || data.query || '',
        'URL': data.url || data.link || '',
        'Title': data.title || '',
        'Description': data.description || data.snippet || '',
        'Summary': data.summary || '',
        'Scraped Date': new Date().toISOString().split('T')[0],
        'Status': data.status || 'Success'
      }
    }, { headers: this.headers });
    
    return response.data;
  }

  async createBatch(records) {
    const response = await axios.post(this.baseUrl, {
      records: records.map(item => ({
        fields: {
          'Search Term': item.searchTerm || item.query || '',
          'URL': item.url || item.link || '',
          'Title': item.title || '',
          'Description': item.description || item.snippet || '',
          'Summary': item.summary || '',
          'Scraped Date': new Date().toISOString().split('T')[0],
          'Status': item.status || 'Success'
        }
      }))
    }, { headers: this.headers });
    
    return response.data;
  }
}

// Main processing function
async function processApifyRun(actorId, runId) {
  console.log('🚀 Starting Apify → Airtable transfer...\n');
  
  validateConfig();
  
  const apify = new ApifyClient(config.apify.token);
  const airtable = new AirtableClient(
    config.airtable.apiKey,
    config.airtable.baseId,
    config.airtable.tableName
  );

  try {
    // Step 1: Get the run
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

    if (!run) {
      throw new Error('Run not found');
    }

    console.log(`✅ Found run: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Started: ${run.startedAt}`);
    console.log(`   Finished: ${run.finishedAt || 'Still running'}`);

    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Run did not succeed. Status: ${run.status}`);
    }

    // Step 2: Get dataset items
    console.log('\n📊 Fetching dataset items...');
    const items = await apify.getDatasetItems(run.defaultDatasetId);
    
    if (!items || items.length === 0) {
      console.log('⚠️  No data found in run');
      return;
    }

    console.log(`✅ Found ${items.length} items to process`);

    // Step 3: Send to Airtable in batches
    console.log('\n📤 Sending to Airtable...');
    const batchSize = 10; // Airtable limit
    let totalCreated = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        // Add delay between batches to respect rate limits
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
        for (const item of batch) {
          try {
            await airtable.createRecord(item);
            totalCreated++;
            console.log(`     ✅ Individual record: ${item.title || item.url || 'Unknown'}`);
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (individualError) {
            console.log(`     ❌ Failed: ${item.title || item.url || 'Unknown'} - ${individualError.message}`);
          }
        }
      }
    }

    // Step 4: Summary
    console.log('\n🎉 Transfer completed!');
    console.log(`   📊 Total items processed: ${items.length}`);
    console.log(`   ✅ Records created in Airtable: ${totalCreated}`);
    console.log(`   📈 Success rate: ${Math.round((totalCreated/items.length)*100)}%`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const actorId = args[0];
  const runId = args[1];

  if (!actorId && !runId) {
    console.log(`
📋 Apify to Airtable Transfer Script

Usage:
  node apify-to-airtable.js [ACTOR_ID] [RUN_ID]

Examples:
  node apify-to-airtable.js your-actor-id
  node apify-to-airtable.js "" specific-run-id  
  node apify-to-airtable.js your-actor-id specific-run-id

Environment variables needed in .env:
  - APIFY_API_TOKEN
  - AIRTABLE_API_KEY
  - AIRTABLE_BASE_ID  
  - AIRTABLE_TABLE_NAME
`);
    process.exit(1);
  }

  processApifyRun(actorId, runId);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processApifyRun };