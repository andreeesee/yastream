// Test configuration and setup

// Global test setup
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.TMDB_API_KEY = process.env.TMDB_API_KEY || 'test-api-key';

// Extend Jest matchers
expect.extend({
  toBeValidStream(received) {
    const requiredProps = ['name', 'title', 'url', 'description'];
    const missing = requiredProps.filter(prop => !received.hasOwnProperty(prop));
    
    if (missing.length > 0) {
      return {
        message: () => `Stream is missing required properties: ${missing.join(', ')}`,
        pass: false
      };
    }

    if (typeof received.url !== 'string' || !received.url.startsWith('http')) {
      return {
        message: () => `Stream must have a valid URL starting with http`,
        pass: false
      };
    }

    return {
      message: () => `Expected ${received} not to be a valid stream`,
      pass: true
    };
  },

  toBeValidAddonResponse(received) {
    if (!received.hasOwnProperty('streams')) {
      return {
        message: () => `Response must have a 'streams' property`,
        pass: false
      };
    }

    if (!Array.isArray(received.streams)) {
      return {
        message: () => `Response.streams must be an array`,
        pass: false
      };
    }

    return {
      message: () => `Expected ${received} not to be a valid addon response`,
      pass: true
    };
  },

  toContainTMDBInfo(received, title) {
    if (typeof received.title !== 'string') {
      return {
        message: () => `Stream must have a title property`,
        pass: false
      };
    }

    const containsTitle = received.title.includes(title);
    
    return {
      message: () => `Expected stream title "${received.title}" to contain "${title}"`,
      pass: containsTitle
    };
  }
});

// Global test helpers
global.testUtils = require('./utils');

// Mock axios for network tests
jest.mock('axios', () => ({
  get: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn()
  }))
}));

// Mock cheerio for HTML parsing tests
jest.mock('cheerio', () => {
  return jest.fn((html) => ({
    find: jest.fn().mockReturnValue([]),
    each: jest.fn(),
    text: () => '',
    attr: () => '',
    length: 0
  }));
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Test timeout for network operations
jest.setTimeout(30000);