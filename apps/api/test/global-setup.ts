import { execSync } from 'node:child_process';
import pg from 'pg';
import { testDatabaseUrl } from './test-env.js';

/**
 * Připraví čistou testovací databázi: vytvoří ji (pokud neexistuje),
 * odstraní schéma a aplikuje všechny migrace – stejně jako v produkci.
 */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, '');

  const admin = new URL(url);
  admin.pathname = '/postgres';
  admin.search = '';
  const adminClient = new pg.Client({ connectionString: admin.toString() });
  await adminClient.connect();
  try {
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName.replaceAll('"', '')}"`);
    }
  } finally {
    await adminClient.end();
  }

  const client = new pg.Client({ connectionString: url.replace(/\?.*$/, '') });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
