import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 nenačítá .env automaticky. Lokálně čteme kořenový .env monorepa,
// v Dockeru jsou proměnné předány přímo prostředím kontejneru.
loadEnv({ path: ['.env', '../../.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` URL nepotřebuje, proto prázdný řetězec jako fallback.
    url: process.env.DATABASE_URL ?? '',
  },
});
