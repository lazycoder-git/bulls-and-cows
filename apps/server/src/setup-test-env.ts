// Set test environment variables before any other imports
process.env.JWT_SECRET = 'testsecret12345678901234567890';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379/0';
process.env.VITEST = 'true';
