// __tests__/utils/logger.test.js
const logger = require('../../src/utils/logger'); // Adjust path as needed

  afterEach(() => {
    // Restore original console methods after each test
    jest.restoreAllMocks();
  });

  test('info logs messages correctly', () => {
    const message = 'This is an info message';
    logger.info(message);
  });

  test('error logs messages and errors correctly', () => {
    const message = 'This is an error message';
    const error = new Error('Test error');
    logger.error(message, error);
  });

  // Add tests for warn and debug methods