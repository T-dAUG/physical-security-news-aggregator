#!/usr/bin/env node

/**
 * List previous Apify runs to backfill data
 */

const axios = require('axios');
require('dotenv').config();

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'apify~google-search-scraper';

if (!APIFY_TOKEN) {
  console.error('❌ APIFY_API_TOKEN not found in environment variables');
  process.exit(1);
}

async function listApifyRuns() {
  console.log('🔍 Finding previous Apify runs...\n');
  
  try {
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?limit=20&desc=true`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${APIFY_TOKEN}` }
    });
    
    const runs = response.data.data.items;
    
    if (runs.length === 0) {
      console.log('❌ No runs found for this actor');
      return;
    }
    
    console.log(`✅ Found ${runs.length} recent runs:\n`);
    console.log('📋 Available Runs for Backfill:');
    console.log('═'.repeat(80));
    
    runs.forEach((run, index) => {
      const startDate = new Date(run.startedAt).toLocaleDateString();
      const startTime = new Date(run.startedAt).toLocaleTimeString();
      const status = run.status === 'SUCCEEDED' ? '✅' : '❌';
      
      console.log(`${index + 1}. ${status} Run ID: ${run.id}`);
      console.log(`   📅 Date: ${startDate} at ${startTime}`);
      console.log(`   ⏱️  Status: ${run.status}`);
      console.log(`   🗂️  Dataset ID: ${run.defaultDatasetId || 'N/A'}`);
      
      if (run.stats && run.stats.outputItems) {
        console.log(`   📊 Items: ${run.stats.outputItems}`);
      }
      console.log('');
    });
    
    // Show successful runs for easy copy-paste
    const successfulRuns = runs.filter(run => run.status === 'SUCCEEDED');
    
    if (successfulRuns.length > 0) {
      console.log('✅ SUCCESSFUL RUNS (ready to backfill):');
      console.log('═'.repeat(50));
      successfulRuns.forEach((run, index) => {
        const date = new Date(run.startedAt).toLocaleDateString();
        console.log(`${index + 1}. ${run.id} (${date})`);
      });
      
      console.log('\n🚀 To backfill these runs, use:');
      console.log('node apify-to-airtable-CORRECTED.js "" [RUN_ID]');
      console.log('\nExample:');
      console.log(`node apify-to-airtable-CORRECTED.js "" ${successfulRuns[0].id}`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching runs:', error.response?.data || error.message);
  }
}

listApifyRuns();