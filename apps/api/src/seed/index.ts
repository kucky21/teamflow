/**
 * CLI pro naplnění databáze demo daty: `npm run db:seed` (v kontejneru)
 * nebo `npm run db:seed:dev` (lokálně přes tsx).
 *
 * POZOR: smaže všechna stávající data v databázi a vytvoří je znovu.
 */
import { config as loadEnv } from 'dotenv';
import { loadConfig } from '../config/env.js';
import { createPrismaClient } from '../lib/prisma.js';
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemoData } from './demo-data.js';

loadEnv({ path: ['.env', '../../.env'], quiet: true });

const config = loadConfig();
if (config.appEnv === 'production') {
  console.error('Seed demo dat je v produkčním prostředí (APP_ENV=production) zakázán.');
  process.exit(1);
}

const db = createPrismaClient(config.databaseUrl);
try {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE activity_logs, task_comments, task_labels, tasks, labels, project_members, projects, sessions, users CASCADE',
  );
  const summary = await seedDemoData(db);
  console.log('Demo data vytvořena:', summary);
  console.log(`Přihlášení: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
} catch (error) {
  console.error('Seed selhal:', error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
