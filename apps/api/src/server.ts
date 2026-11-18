import { config as loadEnv } from 'dotenv';
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createPrismaClient } from './lib/prisma.js';
import { seedDemoData } from './seed/demo-data.js';

// Lokální vývoj: načte kořenový .env monorepa. Existující proměnné prostředí
// (např. v Dockeru) mají přednost a nepřepisují se.
loadEnv({ path: ['.env', '../../.env'], quiet: true });

const config = loadConfig();
const db = createPrismaClient(config.databaseUrl);
const app = await buildApp({ config, db });

if (config.seedOnStart) {
  if (config.appEnv === 'production') {
    app.log.warn('SEED_ON_START je v produkčním prostředí ignorováno.');
  } else if ((await db.user.count()) === 0) {
    app.log.info('Databáze je prázdná – zakládám demo data…');
    const summary = await seedDemoData(db);
    app.log.info(summary, 'Demo data vytvořena');
  }
}

const purgeTimer = setInterval(
  () => {
    app.services.sessions
      .purgeExpired()
      .then((count) => count > 0 && app.log.info({ count }, 'Odstraněny prošlé relace'))
      .catch((err: unknown) => app.log.error({ err }, 'Úklid relací selhal'));
  },
  6 * 60 * 60 * 1000,
);
purgeTimer.unref();

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'Ukončuji server…');
  clearInterval(purgeTimer);
  try {
    await app.close();
    await db.$disconnect();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, 'Chyba při ukončování');
    process.exit(1);
  }
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, 'Server se nepodařilo spustit');
  await db.$disconnect();
  process.exit(1);
}
