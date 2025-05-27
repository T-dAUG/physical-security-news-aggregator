// C:\physical-security-news-aggregator\backend\services\airtableService.js

const axios = require('axios');
const logger = require('../utils/logger'); // Keep this, assuming you use it

// --- IMPORTANT CHANGE: REMOVE THIS LINE IF IT EXISTS ---
// const config = require('../config/config');
// --- END IMPORTANT CHANGE ---

class AirtableService {
  // --- IMPORTANT CHANGE: Ensure constructor accepts 'config' parameter ---
  constructor(config) { // This `config` is the one passed from test-airtable-temp-config.js
    // Add robust checks for the properties you need
    if (!config || !config.airtable || typeof config.airtable.apiKey === 'undefined' ||
        typeof config.airtable.baseId === 'undefined' || typeof config.airtable.tableName === 'undefined') {
      throw new Error('Airtable API configuration (apiKey, baseId, tableName) is required for AirtableService');
    }

    // Assign properties from the `config` object passed to the constructor
    this.apiKey = config.airtable.apiKey;
    this.baseId = config.airtable.baseId;
    this.tableName = config.airtable.tableName;
    this.baseUrl = `https://api.airtable.com/v0/${this.baseId}/${encodeURIComponent(this.tableName)}`;
    this.logger = logger; // Assign logger if you intend to use it within the class
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // ... (rest of your existing AirtableService methods like syncArticle, findRecordById, etc.)
  // Make sure all these methods use `this.apiKey`, `this.baseId`, `this.tableName`
  // and NOT `config.airtable.apiKey`
}

module.exports = AirtableService;