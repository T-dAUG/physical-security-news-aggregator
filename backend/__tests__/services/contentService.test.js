// C:\physical-security-news-aggregator\backend\__tests__\contentService.test.js

const ContentService = require('../../src/services/contentService');
// After mocking, import the mocked versions of the modules
const { ApifyClient } = require('apify-client');
const OpenAI = require('openai');
const logger = require('../../src/utils/logger');
const moment = require('moment');
const _ = require('lodash');

jest.mock('apify-client');
jest.mock('openai');
jest.mock('../../src/utils/logger');
jest.mock('moment');
jest.mock('lodash');

describe('ContentService Unit Tests', () => {
  let mockConfig;
  let contentService;
  let mockApifyClientInstance;
  let mockOpenAIInstance;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test

    // ApifyClient mock setup
    mockApifyClientInstance = {
      actor: jest.fn().mockReturnThis(),
      call: jest.fn().mockResolvedValue({ defaultDatasetId: 'test-dataset-id' }),
      dataset: jest.fn().mockReturnThis(),
      listItems: jest.fn().mockResolvedValue({ items: [] }),
    };
    ApifyClient.mockImplementation(() => mockApifyClientInstance);

    // OpenAI mock setup
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Test summary.' } }],
          }),
        },
      },
    };
    OpenAI.mockImplementation(() => mockOpenAIInstance);

    mockConfig = {
      apify: { token: 'mock-apify-token' },
      openai: { apiKey: 'test-key-safe' },
      scraping: {
        sources: [
          { name: 'Source1', url: 'http://source1.com', selector: '.article-item' },
          { name: 'Source2', url: 'http://source2.com', selector: '.another-selector' },
        ],
        maxArticlesPerSource: 5,
        contentFreshnessHours: 24,
      },
      categories: {
        'Access Control': ['access control', 'biometric'],
      },
    };

    contentService = new ContentService(mockConfig);

    // --- NEW MOCK FOR MOMENT.JS ---
    // This mocks the moment() constructor to return a chained object.
    moment.mockImplementation((date) => {
      const mockMomentInstance = {
        isValid: jest.fn(() => true), // Assume dates are always valid for these tests
        toISOString: jest.fn(() => date || new Date().toISOString()), // Returns the input date or a new date
        isAfter: jest.fn(), // To be mocked specifically in tests
        subtract: jest.fn(() => {
          // This allows chaining: moment().subtract(...).isAfter(...)
          const resultMoment = {
            isValid: jest.fn(() => true),
            toISOString: jest.fn(() => new Date().toISOString()), // Return a new date for subtraction result
            isAfter: jest.fn(), // To be mocked specifically in tests
          }; // <-- This curly brace closes resultMoment
          return resultMoment; // <-- This returns resultMoment from subtract()
        }), // <-- This parenthesis closes the subtract() mockImplementation
        // If you have 'add', 'format', etc., they would go here too
      }; // <-- This curly brace closes mockMomentInstance
      return mockMomentInstance; // <-- This returns mockMomentInstance from moment.mockImplementation
    }); // <-- This parenthesis closes the moment.mockImplementation
  }); // <-- THIS IS THE CORRECT CLOSING FOR THE beforeEach BLOCK

  // ------------------------------------------
  // YOUR ACTUAL TEST CASES GO HERE!
  // Example:
  test('scrapeNews calls scrapeSource for each source and dedupes', async () => {
    // ... your test logic ...
  });

  // Another test:
  test('another test case', () => {
    // ... test logic ...
  });
  // ------------------------------------------

}); // <-- THIS IS THE CORRECT CLOSING FOR THE describe BLOCK