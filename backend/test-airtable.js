#!/usr/bin/env node

/**
 * Test script to debug Airtable field issues
 * Tests one simple record to see what's wrong
 */

const axios = require('axios');
require('dotenv').config();

const config = {
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME
  }
};

function validateConfig() {
  const missing = [];
  if (!config.airtable.apiKey) missing.push('AIRTABLE_API_KEY');
  if (!config.airtable.baseId) missing.push('AIRTABLE_BASE_ID');
  if (!config.airtable.tableName) missing.push('AIRTABLE_TABLE_NAME');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
}

async function getTableSchema() {
  console.log('🔍 Getting Airtable table schema...\n');
  
  const url = `https://api.airtable.com/v0/meta/bases/${config.airtable.baseId}/tables`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.apiKey}`
      }
    });
    
    const tables = response.data.tables;
    const targetTable = tables.find(table => table.name === config.airtable.tableName);
    
    if (!targetTable) {
      console.error(`❌ Table "${config.airtable.tableName}" not found!`);
      console.log('\n📋 Available tables:');
      tables.forEach(table => {
        console.log(`   - "${table.name}"`);
      });
      return null;
    }
    
    console.log(`✅ Found table: "${targetTable.name}"`);
    console.log(`📋 Table ID: ${targetTable.id}`);
    console.log('\n🏗️ Field Structure:');
    console.log('==================');
    
    targetTable.fields.forEach((field, index) => {
      console.log(`${index + 1}. "${field.name}" (${field.type})`);
      if (field.options) {
        console.log(`   Options: ${JSON.stringify(field.options)}`);
      }
    });
    
    return targetTable;
    
  } catch (error) {
    console.error('❌ Failed to get table schema:', error.response?.data || error.message);
    return null;
  }
}

async function testSimpleRecord() {
  console.log('\n🧪 Testing simple record creation...\n');
  
  const baseUrl = `https://api.airtable.com/v0/${config.airtable.baseId}/${encodeURIComponent(config.airtable.tableName)}`;
  
  // Test 1: Very minimal record
  const testData1 = {
    fields: {
      'Title': 'TEST RECORD - Please Delete'
    }
  };
  
  console.log('Test 1: Minimal record (Title only)');
  console.log('Data:', JSON.stringify(testData1, null, 2));
  
  try {
    const response = await axios.post(baseUrl, testData1, {
      headers: {
        'Authorization': `Bearer ${config.airtable.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Record created:', response.data.id);
    
    // Delete the test record
    try {
      await axios.delete(`${baseUrl}/${response.data.id}`, {
        headers: { 'Authorization': `Bearer ${config.airtable.apiKey}` }
      });
      console.log('🗑️ Test record deleted');
    } catch (deleteError) {
      console.log('⚠️ Could not delete test record:', deleteError.message);
    }
    
  } catch (error) {
    console.log('❌ Failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test 2: Full record with all expected fields
  console.log('\n' + '='.repeat(50));
  console.log('Test 2: Full record (all fields)');
  
  const testData2 = {
    fields: {
      'Search Term': 'test search',
      'URL': 'https://example.com',
      'Title': 'Test Article Title',
      'Description': 'This is a test description',
      'Summary': 'Test summary',
      'Scraped Date': new Date().toISOString().split('T')[0],
      'Status': 'Success'
    }
  };
  
  console.log('Data:', JSON.stringify(testData2, null, 2));
  
  try {
    const response = await axios.post(baseUrl, testData2, {
      headers: {
        'Authorization': `Bearer ${config.airtable.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Record created:', response.data.id);
    
    // Delete the test record
    try {
      await axios.delete(`${baseUrl}/${response.data.id}`, {
        headers: { 'Authorization': `Bearer ${config.airtable.apiKey}` }
      });
      console.log('🗑️ Test record deleted');
    } catch (deleteError) {
      console.log('⚠️ Could not delete test record:', deleteError.message);
    }
    
  } catch (error) {
    console.log('❌ Failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    
    // Test individual fields if full record fails
    console.log('\n🔍 Testing individual fields...');
    
    const fields = Object.keys(testData2.fields);
    for (const fieldName of fields) {
      console.log(`\nTesting field: "${fieldName}"`);
      
      const singleFieldData = {
        fields: {
          [fieldName]: testData2.fields[fieldName]
        }
      };
      
      try {
        const fieldResponse = await axios.post(baseUrl, singleFieldData, {
          headers: {
            'Authorization': `Bearer ${config.airtable.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ "${fieldName}" works!`);
        
        // Delete test record
        try {
          await axios.delete(`${baseUrl}/${fieldResponse.data.id}`, {
            headers: { 'Authorization': `Bearer ${config.airtable.apiKey}` }
          });
        } catch (deleteError) {
          // Ignore delete errors for individual field tests
        }
        
      } catch (fieldError) {
        console.log(`❌ "${fieldName}" failed:`, fieldError.response?.data?.error || fieldError.message);
      }
    }
  }
}

async function main() {
  console.log('🧪 Airtable Field Debugging Tool\n');
  
  validateConfig();
  
  console.log('Configuration:');
  console.log('- Base ID:', config.airtable.baseId);
  console.log('- Table Name:', config.airtable.tableName);
  console.log('- API Key:', config.airtable.apiKey.substring(0, 10) + '...');
  console.log();
  
  // Step 1: Get table schema
  const tableSchema = await getTableSchema();
  
  // Step 2: Test record creation
  await testSimpleRecord();
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check that your Airtable field names match exactly');
  console.log('2. Verify field types (Text, URL, Date, Single Select, etc.)');
  console.log('3. Look for any required fields that might be missing');
  console.log('4. Check field length limits');
}

if (require.main === module) {
  main();
}