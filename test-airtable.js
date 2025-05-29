const axios = require('axios');
require('dotenv').config();

async function testAirtable() {
  console.log('Testing Airtable connection...');
  
  const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`;
  const headers = {
    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get existing records
    console.log('1. Testing connection...');
    const response = await axios.get(baseUrl + '?maxRecords=1', { headers });
    console.log('✅ Connection successful!');
    
    // Test 2: Try to create a simple record
    console.log('2. Testing record creation...');
    const testRecord = {
      fields: {
        'Title': 'TEST - DELETE ME',
        'Summary': 'Test summary',
        'Category': 'News',
        'source': 'test.com',  
        'link': 'https://test.com',
        'date published': '2025-05-29'
      }
    };
    
    const createResponse = await axios.post(baseUrl, testRecord, { headers });
    console.log('✅ Record created successfully!');
    console.log('Record ID:', createResponse.data.id);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status);
    console.log('Error details:', error.response?.data);
  }
}

testAirtable();