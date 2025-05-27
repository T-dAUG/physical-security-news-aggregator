// src/utils/logger.js

// Remove or fix any config imports if they exist
// const config = require('../../config/config'); // This line is causing the error

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    // Get log level from environment variable or default to INFO
    this.logLevel = this.getLogLevel();
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      green: '\x1b[32m',
      gray: '\x1b[90m'
    };
  }

  /**
   * Get current log level from environment
   * @returns {number} Log level
   */
  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    return LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.INFO;
  }

  /**
   * Get formatted timestamp
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message with timestamp and level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {string} color - Color code
   * @returns {string} Formatted message
   */
  formatMessage(level, message, color = '') {
    const timestamp = this.getTimestamp();
    const reset = this.colors.reset;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, use JSON format for structured logging
      return JSON.stringify({
        timestamp,
        level,
        message,
        service: 'physical-security-news-aggregator'
      });
    } else {
      // In development, use colored console output
      return `${color}[${timestamp}] ${level}: ${message}${reset}`;
    }
  }

  /**
   * Log info level messages
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  info(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, this.colors.blue);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Log error level messages
   * @param {string} message - Message to log
   * @param {Error|any} error - Error object or additional data
   * @param {...any} args - Additional arguments
   */
  error(message, error, ...args) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, this.colors.red);
      
      if (error instanceof Error) {
        console.error(formattedMessage, ...args);
        if (process.env.NODE_ENV !== 'production') {
          // In development, also log the stack trace
          console.error(this.colors.red + error.stack + this.colors.reset);
        } else {
          // In production, log structured error data
          console.error(JSON.stringify({
            timestamp: this.getTimestamp(),
            level: 'ERROR',
            message,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            },
            service: 'physical-security-news-aggregator'
          }));
        }
      } else if (error) {
        console.error(formattedMessage, error, ...args);
      } else {
        console.error(formattedMessage, ...args);
      }
    }
  }

  /**
   * Log warning level messages
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, this.colors.yellow);
      console.warn(formattedMessage, ...args);
    }
  }

  /**
   * Log debug level messages
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, this.colors.gray);
      console.log(formattedMessage, ...args);
    }
  }

  /**
   * Set log level programmatically
   * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
   */
  setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (LOG_LEVELS[upperLevel] !== undefined) {
      this.logLevel = LOG_LEVELS[upperLevel];
    } else {
      this.warn(`Invalid log level: ${level}. Using current level.`);
    }
  }

  /**
   * Get current log level as string
   * @returns {string} Current log level
   */
  getLevel() {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.logLevel);
  }

  /**
   * Create child logger with additional context
   * @param {Object} context - Additional context to include in logs
   * @returns {Object} Child logger
   */
  child(context) {
    const parentLogger = this;
    
    return {
      info(message, ...args) {
        const contextMessage = `[${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}] ${message}`;
        parentLogger.info(contextMessage, ...args);
      },
      
      error(message, error, ...args) {
        const contextMessage = `[${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}] ${message}`;
        parentLogger.error(contextMessage, error, ...args);
      },
      
      warn(message, ...args) {
        const contextMessage = `[${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}] ${message}`;
        parentLogger.warn(contextMessage, ...args);
      },
      
      debug(message, ...args) {
        const contextMessage = `[${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}] ${message}`;
        parentLogger.debug(contextMessage, ...args);
      }
    };
  }
}

// Create and export a singleton instance
const logger = new Logger();

module.exports = logger;