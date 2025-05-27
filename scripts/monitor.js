// scripts/monitor.js - Production monitoring
const axios = require('axios');

const BACKEND_URL = 'https://backend-production-416d.up.railway.app';
const FRONTEND_URL = 'https://frontend-production-416d.up.railway.app';

async function checkEndpoint(url, name) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    console.log(`✅ ${name}: ${response.status} - ${response.statusText}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function checkAPIResponse(url, name, expectedContent) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const hasContent = JSON.stringify(response.data).includes(expectedContent);
    
    if (hasContent) {
      console.log(`✅ ${name}: Content verified`);
      return true;
    } else {
      console.error(`❌ ${name}: Expected content not found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function monitor() {
  console.log('🔍 Starting production monitoring...');
  console.log('⏰ Time:', new Date().toISOString());
  console.log('='.repeat(50));
  
  const results = [];
  
  // Check backend health
  results.push(await checkEndpoint(`${BACKEND_URL}/health`, 'Backend Health'));
  
  // Check backend API
  results.push(await checkAPIResponse(`${BACKEND_URL}/api/articles`, 'Articles API', 'Sample Security Article'));
  
  // Check frontend
  results.push(await checkEndpoint(FRONTEND_URL, 'Frontend'));
  
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`🎉 All checks passed (${passed}/${total})`);
    console.log('✨ System is healthy!');
  } else {
    console.error(`⚠️ Some checks failed (${passed}/${total})`);
    process.exit(1);
  }
}

// Run monitoring
monitor().catch(error => {
  console.error('💥 Monitoring failed:', error.message);
  process.exit(1);
});