#!/usr/bin/env node

/**
 * Debug script to see what data structure Apify returns
 * Usage: node debug-data.js [ACTOR_ID] [RUN_ID]
 */

const axios = require('axios');
require('dotenv').config();

const config = {
  apify: {
    token: process.env.APIFY_API_TOKEN
  }
};

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

async function debugData(actorId, runId) {
  console.log('🔍 Debugging Apify Data Structure...\n');
  
  const apify = new ApifyClient(config.apify.token);

  try {
    // Get the run
    let run;
    if (runId) {
      console.log(`📥 Fetching specific run: ${runId}`);
      run = await apify.getRun(runId);
    } else if (actorId) {
      console.log(`📥 Fetching latest run for actor: ${actorId}`);
      run = await apify.getLatestRun(actorId);
    }

    console.log(`✅ Found run: ${run.id}`);
    console.log(`   Status: ${run.status}\n`);

    // Get dataset items
    console.log('📊 Fetching dataset items...');
    const items = await apify.getDatasetItems(run.defaultDatasetId);
    
    console.log(`✅ Found ${items.length} items\n`);

    // Show first item structure
    if (items.length > 0) {
      console.log('🔬 FIRST ITEM STRUCTURE:');
      console.log('========================');
      console.log(JSON.stringify(items[0], null, 2));
      console.log('\n');

      // Show all available fields
      console.log('📋 AVAILABLE FIELDS IN FIRST ITEM:');
      console.log('==================================');
      const fields = Object.keys(items[0]);
      fields.forEach((field, index) => {
        console.log(`${index + 1}. "${field}": ${typeof items[0][field]}`);
      });
      console.log('\n');

      // Show sample values
      console.log('💡 SAMPLE VALUES:');
      console.log('=================');
      fields.slice(0, 5).forEach(field => {
        let value = items[0][field];
        if (typeof value === 'string' && value.length > 100) {
          value = value.substring(0, 100) + '...';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        console.log(`${field}: ${value}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const actorId = args[0];
  const runId = args[1];

  if (!actorId && !runId) {
    console.log(`
🔍 Apify Data Structure Debugger

Usage:
  node debug-data.js [ACTOR_ID] [RUN_ID]

Examples:
  node debug-data.js apify~google-search-scraper
  node debug-data.js "" uKrgjRLhDlmTBim7u
`);
    process.exit(1);
  }

  debugData(actorId, runId);
}

if (require.main === module) {
  main();
}