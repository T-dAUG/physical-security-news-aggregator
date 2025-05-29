// scripts/monitor.js - Run this periodically or in CI
const axios = require('axios');

const BACKEND_URL = 'https://backend-production-619d.up.railway.app';
const FRONTEND_URL = 'https://frontend-production-416d.up.railway.app';

async function checkHealth() {
  const results = {
    backend: { status: 'unknown', response: null, error: null },
    frontend: { status: 'unknown', response: null, error: null },
    api: { status: 'unknown', response: null, error: null }
  };

  // Check Backend Health
  try {
    const healthResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 10000 });
    results.backend = {
      status: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
      response: healthResponse.data,
      error: null
    };
  } catch (error) {
    results.backend = {
      status: 'error',
      response: null,
      error: error.message
    };
  }

  // Check API Endpoint
  try {
    const apiResponse = await axios.get(`${BACKEND_URL}/api/articles`, { timeout: 10000 });
    results.api = {
      status: 'healthy',
      response: apiResponse.data,
      error: null,
      articleCount: apiResponse.data.articles?.length || 0
    };
  } catch (error) {
    results.api = {
      status: 'error',
      response: null,
      error: error.message
    };
  }

  // Check Frontend
  try {
    const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 10000 });
    results.frontend = {
      status: frontendResponse.status === 200 ? 'healthy' : 'unhealthy',
      response: 'Frontend loaded',
      error: null
    };
  } catch (error) {
    results.frontend = {
      status: 'error',
      response: null,
      error: error.message
    };
  }

  return results;
}

async function runMonitoring() {
  console.log('🔍 Starting health check...');
  const results = await checkHealth();
  
  console.log('📊 Health Check Results:');
  console.log(`Backend: ${results.backend.status}`);
  console.log(`API: ${results.api.status} (${results.api.articleCount || 0} articles)`);
  console.log(`Frontend: ${results.frontend.status}`);
  
  // Fail if critical services are down
  const criticalFailures = [
    results.backend.status === 'error',
    results.api.status === 'error',
    results.frontend.status === 'error'
  ].filter(Boolean);
  
  if (criticalFailures.length > 0) {
    console.error('❌ Critical services are down!');
    console.error(JSON.stringify(results, null, 2));
    process.exit(1);
  }
  
  console.log('✅ All services healthy!');
  return results;
}

if (require.main === module) {
  runMonitoring().catch(console.error);
}

module.exports = { checkHealth, runMonitoring };