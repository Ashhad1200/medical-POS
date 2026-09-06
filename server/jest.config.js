/**
 * Tests run against a throwaway Postgres database (medicalpos_test) in the
 * local `medicalpos-db` container. globalSetup drops + recreates it and runs
 * every migration; env.js points the app's db pool at it before the app loads.
 */
module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/globalSetup.js',
  setupFiles: ['<rootDir>/tests/env.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
  ],
};
