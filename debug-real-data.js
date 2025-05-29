const axios = require('axios');
require('dotenv').config();

async function debugApifyData() {
  console.log('🔍 Debugging real Apify data...');
  
  // Use your Apify client to get one page of data
  const apifyToken = process.env.APIFY_API_TOKEN;
  const runId = 'TCNglrrt0aW4HMJZB';
  
  // Get the dataset
  const apifyUrl = `https://api.apify.com/v2/actor-runs/${runId}`;
  const runResponse = await axios.get(apifyUrl, {
    headers: { Authorization: `Bearer ${apifyToken}` }
  });
  
  const datasetUrl = `https://api.apify.com/v2/datasets/${runResponse.data.data.defaultDatasetId}/items`;
  const dataResponse = await axios.get(datasetUrl, {
    headers: { Authorization: `Bearer ${apifyToken}` }
  });
  
  const searchPages = dataResponse.data;
  console.log(`📄 Got ${searchPages.length} search pages`);
  
  // Get first page and first result
  const firstPage = searchPages[0];
  const firstResult = firstPage.organicResults[0];
  
  console.log('\n📊 Sample data from Apify:');
  console.log('Search term:', firstPage.searchQuery?.term);
  console.log('Title:', firstResult.title);
  console.log('URL:', firstResult.url);
  console.log('Description:', firstResult.description?.substring(0, 100) + '...');
  
  // Try to process this like the main script does
  const processedData = {
    searchTerm: firstPage.searchQuery?.term || '',
    url: firstResult.url,
    title: firstResult.title,
    description: firstResult.description || ''
  };
  
  // Determine category
  let category = 'News';
  const searchTerm = processedData.searchTerm.toLowerCase();
  if (searchTerm.includes('policy')) category = 'Policy';
  else if (searchTerm.includes('statistic') || searchTerm.includes('fbi')) category = 'Stats';
  else if (searchTerm.includes('technology')) category = 'Tech';
  
  // Extract domain
  let source = '';
  try {
    const urlObj = new URL(processedData.url);
    source = urlObj.hostname;
  } catch (e) {
    source = 'unknown';
  }
  
  const airtableRecord = {
    'Title': processedData.title || 'Untitled',
    'Summary': processedData.description || '',
    'Category': category,
    'source': source,
    'link': processedData.url || '',
    'date published': new Date().toISOString().split('T')[0]
  };
  
  console.log('\n🗺️ Processed for Airtable:');
  console.log('Title:', airtableRecord.Title);
  console.log('Summary length:', airtableRecord.Summary.length);
  console.log('Category:', airtableRecord.Category);
  console.log('Source:', airtableRecord.source);
  console.log('Link:', airtableRecord.link);
  console.log('Date:', airtableRecord['date published']);
  
  // Try to send to Airtable
  const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`;
  const headers = {
    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.post(baseUrl, { fields: airtableRecord }, { headers });
    console.log('\n✅ Real data record created successfully!');
    console.log('Record ID:', response.data.id);
  } catch (error) {
    console.log('\n❌ Real data failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

debugApifyData().catch(console.error);