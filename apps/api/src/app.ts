import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { errorBodyDto } from '@teamflow/shared';
import { z } from 'zod';
import type { AppConfig } from './config/env.js';
import type { Db } from './lib/prisma.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { taskRoutes } from './modules/tasks/tasks.routes.js';
import { authPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { createServices } from './services.js';
import './types.js';

export interface BuildAppOptions {
  config: AppConfig;
  db: Db;
  logger?: FastifyServerOptions['logger'];
}

function defaultLogger(config: AppConfig): FastifyServerOptions['logger'] {
  if (config.nodeEnv === 'test') return false;
  return {
    level: config.logLevel,
    redact: {
      paths: ['req.headers.cookie', 'req.headers["x-csrf-token"]', 'res.headers["set-cookie"]'],
      censor: '[skryto]',
    },
    ...(config.nodeEnv === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : {}),
  };
}

export async function buildApp({ config, db, logger }: BuildAppOptions) {
  const app = Fastify({
    logger: logger ?? defaultLogger(config),
    trustProxy: config.trustProxy,
    bodyLimit: 1024 * 1024,
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('config', config);
  app.decorate('db', db);
  app.decorate('services', createServices(db, config));
  registerErrorHandler(app);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'TeamFlow API',
        description:
          'REST API aplikace TeamFlow. Autentizace probíhá HttpOnly cookie `tf_session`; ' +
          'zápisové požadavky přihlášeného uživatele musí obsahovat hlavičku `X-CSRF-Token` ' +
          's hodnotou z cookie `tf_csrf`.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'tf_session' },
        },
      },
      tags: [
        { name: 'Auth', description: 'Registrace, přihlášení a relace' },
        { name: 'Users', description: 'Profil a vyhledávání uživatelů' },
        { name: 'Projects', description: 'Správa projektů' },
        { name: 'Members', description: 'Členové projektu a role' },
        { name: 'Labels', description: 'Štítky projektu' },
        { name: 'Tasks', description: 'Úkoly a Kanban' },
        { name: 'Comments', description: 'Komentáře k úkolům' },
        { name: 'Activity', description: 'Auditní log a historie změn' },
        { name: 'Dashboard', description: 'Agregovaná data' },
        { name: 'System', description: 'Provozní endpointy' },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs', staticCSP: true });

  await app.register(authPlugin);

  app.get(
    '/api/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Stav služby a databáze',
        response: {
          200: z.object({ status: z.literal('ok'), database: z.literal('ok') }),
          503: errorBodyDto,
        },
      },
    },
    async (_request, reply) => {
      try {
        await db.$queryRaw`SELECT 1`;
        return { status: 'ok' as const, database: 'ok' as const };
      } catch (error) {
        app.log.error({ err: error }, 'Health check: databáze nedostupná');
        return reply.status(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Databáze není dostupná.' } });
      }
    },
  );

  await app.register(authRoutes, { prefix: '/api' });
  await app.register(
    async (api) => {
      api.addHook('onRequest', api.requireAuth);
      await api.register(projectRoutes);
      await api.register(taskRoutes);
      await api.register(dashboardRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
