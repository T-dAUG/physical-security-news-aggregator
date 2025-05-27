// debug-test.js - Enhanced version with full error details
const axios = require('axios');

const API_BASE = 'http://localhost:1/api';

async function debugTest() {
  console.log('🔍 DEBUGGING API CONNECTION');
  console.log('=' .repeat(50));
  
  // Test 1: Basic server connectivity
  console.log('1. Testing basic server connectivity...');
  try {
    const response = await axios.get('http://localhost:4000', { timeout: 5000 });
    console.log('✅ Server is responding');
    console.log('   Status:', response.status);
    console.log('   Response:', response.data);
  } catch (error) {
    console.log('❌ Server connection failed');
    console.log('   Error Type:', error.code);
    console.log('   Error Message:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   🚨 DIAGNOSIS: Server is not running on port 4000');
      console.log('   💡 SOLUTION: Run "npm run dev" in your backend directory');
      return;
    }
  }

  // Test 2: API Base Path
  console.log('\n2. Testing API base path...');
  try {
    const response = await axios.get(API_BASE, { timeout: 5000 });
    console.log('✅ API base path responding');
    console.log('   Status:', response.status);
  } catch (error) {
    console.log('❌ API base path failed');
    console.log('   Full Error:', {
      code: error.code,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }

  // Test 3: Individual endpoints with full error details
  const endpoints = [
    { name: 'Categories', path: '/categories' },
    { name: 'Sources', path: '/sources' },
    { name: 'Articles', path: '/articles' },
    { name: 'Analytics', path: '/analytics' }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n3.${endpoints.indexOf(endpoint) + 1}. Testing ${endpoint.name}...`);
    try {
      const response = await axios.get(`${API_BASE}${endpoint.path}`, { timeout: 10000 });
      console.log(`✅ ${endpoint.name} endpoint working`);
      console.log('   Status:', response.status);
      console.log('   Data type:', typeof response.data);
      console.log('   Data preview:', JSON.stringify(response.data).substring(0, 100) + '...');
    } catch (error) {
      console.log(`❌ ${endpoint.name} endpoint failed`);
      console.log('   Full Error Details:');
      console.log('   - Code:', error.code);
      console.log('   - Message:', error.message);
      console.log('   - HTTP Status:', error.response?.status);
      console.log('   - HTTP Status Text:', error.response?.statusText);
      console.log('   - Response Data:', error.response?.data);
      console.log('   - Request URL:', error.config?.url);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Debug test completed');
}

debugTest().catch(console.error);