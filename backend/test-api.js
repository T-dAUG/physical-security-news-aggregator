// test-api.js - Place this in your backend root directory
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

// Add timeout and better error handling
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 second timeout for scraping operations
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testAPIs() {
  console.log('🚀 Starting API Tests...\n');
  
  try {
    // Test 1: Health Check (if you have one)
    console.log('📋 Testing server health...');
    try {
      const healthResponse = await apiClient.get('/health');
      console.log('✅ Health check successful:', healthResponse.data);
    } catch (error) {
      console.log('⚠️  No health endpoint found, continuing with other tests...');
    }

    // Test 2: Categories endpoint
    console.log('\n📂 Testing categories fetch...');
    try {
      const categoriesResponse = await apiClient.get('/categories');
      console.log('✅ Categories fetch successful');
      console.log('   Categories found:', categoriesResponse.data?.length || 'N/A');
      if (categoriesResponse.data?.length > 0) {
        console.log('   Sample categories:', categoriesResponse.data.slice(0, 3));
      }
    } catch (error) {
      console.error('❌ Categories test failed:', error.response?.data || error.message);
    }

    // Test 3: Sources endpoint
    console.log('\n🌐 Testing sources fetch...');
    try {
      const sourcesResponse = await apiClient.get('/sources');
      console.log('✅ Sources fetch successful');
      console.log('   Sources found:', sourcesResponse.data?.length || 'N/A');
      if (sourcesResponse.data?.length > 0) {
        console.log('   Sample sources:', sourcesResponse.data.slice(0, 2));
      }
    } catch (error) {
      console.error('❌ Sources test failed:', error.response?.data || error.message);
    }

    // Test 4: Articles endpoint (before scraping)
    console.log('\n📄 Testing articles fetch (initial)...');
    try {
      const initialArticlesResponse = await apiClient.get('/articles');
      console.log('✅ Initial articles fetch successful');
      console.log('   Articles found:', initialArticlesResponse.data?.length || 0);
    } catch (error) {
      console.error('❌ Initial articles test failed:', error.response?.data || error.message);
    }

    // Test 5: Manual scrape (this might take a while)
    console.log('\n🔍 Testing manual scrape...');
    console.log('   (This may take 30-60 seconds...)');
    try {
      const scrapeResponse = await apiClient.post('/scrape/manual');
      console.log('✅ Scrape successful');
      console.log('   Scrape result:', scrapeResponse.data);
      
      // Wait a moment for processing
      console.log('   Waiting 3 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('❌ Scrape test failed:', error.response?.data || error.message);
      if (error.code === 'ECONNABORTED') {
        console.error('   This might be due to timeout - scraping can take time');
      }
    }

    // Test 6: Articles endpoint (after scraping)
    console.log('\n📄 Testing articles fetch (after scraping)...');
    try {
      const articlesResponse = await apiClient.get('/articles');
      console.log('✅ Articles fetch successful');
      console.log('   Articles found:', articlesResponse.data?.length || 0);
      
      if (articlesResponse.data?.length > 0) {
        const sampleArticle = articlesResponse.data[0];
        console.log('   Sample article:');
        console.log('   - Title:', sampleArticle.title?.substring(0, 60) + '...' || 'N/A');
        console.log('   - Source:', sampleArticle.source || 'N/A');
        console.log('   - Category:', sampleArticle.category || 'N/A');
        console.log('   - Published:', sampleArticle.publishedDate || 'N/A');
      }
      
    } catch (error) {
      console.error('❌ Final articles test failed:', error.response?.data || error.message);
    }

    // Test 7: Analytics endpoint
    console.log('\n📊 Testing analytics...');
    try {
      const analyticsResponse = await apiClient.get('/analytics');
      console.log('✅ Analytics fetch successful:', analyticsResponse.data);
    } catch (error) {
      console.error('❌ Analytics test failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 API Testing Complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Check your backend logs for any errors');
    console.log('   2. Verify the scraped articles make sense');
    console.log('   3. Test the frontend connection');
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error.message);
  }
}

// Helper function to test with specific parameters
async function testScrapeWithParams() {
  console.log('\n🔧 Testing scrape with specific parameters...');
  try {
    const scrapeResponse = await apiClient.post('/scrape/manual', {
      sources: ['specific-source'], // Adjust based on your config
      maxArticles: 5
    });
    console.log('✅ Parameterized scrape successful:', scrapeResponse.data);
  } catch (error) {
    console.error('❌ Parameterized scrape failed:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  console.log('🏃‍♂️ Starting Backend API Tests');
  console.log('📡 Testing against:', API_BASE);
  console.log('⏰ Current time:', new Date().toISOString());
  console.log('=' .repeat(50));
  
  await testAPIs();
  
  // Uncomment to test scrape with parameters
  // await testScrapeWithParams();
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Testing session completed');
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAPIs, API_BASE };