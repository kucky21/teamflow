import { testDatabaseUrl } from './test-env.js';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
