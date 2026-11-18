import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((v) => v === 'true' || v === '1')
  .optional();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'test', 'production']).default('local'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL musí být nastavena'),
  APP_ORIGIN: z.string().default('http://localhost:8080,http://localhost:5173'),
  COOKIE_SECURE: bool,
  TRUST_PROXY: bool,
  SEED_ON_START: bool,
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  appEnv: 'local' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  databaseUrl: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  trustProxy: boolean;
  seedOnStart: boolean;
  sessionTtlMs: number;
  authRateLimitMax: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Neplatná konfigurace prostředí:\n${issues}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    appEnv: e.APP_ENV,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    allowedOrigins: e.APP_ORIGIN.split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    cookieSecure: e.COOKIE_SECURE ?? false,
    trustProxy: e.TRUST_PROXY ?? false,
    seedOnStart: e.SEED_ON_START ?? false,
    sessionTtlMs: e.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    authRateLimitMax: e.AUTH_RATE_LIMIT_MAX,
  };
}
