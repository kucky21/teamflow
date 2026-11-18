import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env', '../../.env'], quiet: true });

/** URL testovací databáze. Nikdy nesmí ukazovat na vývojovou ani produkční DB. */
export function testDatabaseUrl(): string {
  const url =
    process.env['DATABASE_URL_TEST'] ?? 'postgresql://teamflow:teamflow@127.0.0.1:5433/teamflow_test?schema=public';
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`DATABASE_URL_TEST musí ukazovat na databázi s příponou _test (aktuálně „${dbName}“).`);
  }
  return url;
}
