// test-endpoints.js - Test your Railway deployment
const https = require('https');

// Disable SSL verification for testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const BACKEND_URL = 'https://backend-production-416d.up.railway.app';
const FRONTEND_URL = 'https://frontend-production-416d.up.railway.app';

async function testEndpoint(url, description) {
  console.log(`\n🧪 Testing ${description}...`);
  console.log(`📍 URL: ${url}`);
  
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log(`📊 Status: ${response.statusCode}`);
        console.log(`🔒 CORS Headers:`);
        console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'Not set'}`);
        console.log(`   Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods'] || 'Not set'}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ Response: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (error) {
          console.log(`📄 Response: ${data.substring(0, 200)}...`);
        }
        
        resolve(response.statusCode === 200);
      });
    });
    
    request.on('error', (error) => {
      console.log(`❌ Error: ${error.message}`);
      resolve(false);
    });
    
    request.setTimeout(10000, () => {
      console.log(`⏰ Timeout: Request took too long`);
      request.destroy();
      resolve(false);
    });
  });
}

async function testCORS(url, origin) {
  console.log(`\n🔗 Testing CORS for ${url} from ${origin}...`);
  
  return new Promise((resolve) => {
    const options = {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET'
      }
    };
    
    const request = https.request(url, options, (response) => {
      console.log(`📊 CORS Status: ${response.statusCode}`);
      console.log(`🔒 CORS Headers:`);
      console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'Not set'}`);
      console.log(`   Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods'] || 'Not set'}`);
      console.log(`   Access-Control-Allow-Headers: ${response.headers['access-control-allow-headers'] || 'Not set'}`);
      
      const corsAllowed = response.headers['access-control-allow-origin'] === origin;
      console.log(`✅ CORS Status: ${corsAllowed ? 'ALLOWED' : 'BLOCKED'}`);
      
      resolve(corsAllowed);
    });
    
    request.on('error', (error) => {
      console.log(`❌ CORS Error: ${error.message}`);
      resolve(false);
    });
    
    request.end();
  });
}

async function runTests() {
  console.log('🚀 Physical Security News Aggregator - Endpoint Testing');
  console.log('======================================================');
  
  const results = [];
  
  // Test backend endpoints
  results.push(await testEndpoint(`${BACKEND_URL}/health`, 'Backend Health'));
  results.push(await testEndpoint(`${BACKEND_URL}/api/articles`, 'Articles API'));
  results.push(await testEndpoint(`${BACKEND_URL}/`, 'Backend Root'));
  
  // Test CORS
  results.push(await testCORS(`${BACKEND_URL}/api/articles`, FRONTEND_URL));
  
  // Test frontend
  results.push(await testEndpoint(FRONTEND_URL, 'Frontend'));
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your deployment is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.');
  }
  
  console.log('\n🌐 Manual Testing:');
  console.log('==================');
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend Health: ${BACKEND_URL}/health`);
  console.log(`Backend API: ${BACKEND_URL}/api/articles`);
}

runTests().catch(console.error);