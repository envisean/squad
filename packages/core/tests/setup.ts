// Mock OpenAI API key for tests
process.env.OPENAI_API_KEY = 'test-key';

// Add global test utilities and mocks here
global.console = {
  ...console,
  // Uncomment to disable console.log during tests
  // log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};