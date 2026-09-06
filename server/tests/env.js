// Loaded via jest `setupFiles` — runs in each test worker BEFORE the app is
// required, so config/database.js picks up the test database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_EXPIRY = '7d';
process.env.POSTGRES_HOST = process.env.TEST_PG_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.TEST_PG_PORT || '5436';
process.env.POSTGRES_DB = 'medicalpos_test';
process.env.POSTGRES_USER = process.env.TEST_PG_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.TEST_PG_PASSWORD || 'admin123';
process.env.POSTGRES_SSL = 'false';
