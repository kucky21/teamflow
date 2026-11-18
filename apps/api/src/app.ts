import './types.js';

import { randomUUID } from 'node:crypto';

import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppConfig } from './config/env.js';
import type { Db } from './lib/prisma.js';
import { activityRoutes } from './modules/activity/activity.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { commentRoutes } from './modules/comments/comments.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { labelRoutes } from './modules/labels/labels.routes.js';
import { memberRoutes } from './modules/members/members.routes.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { healthRoutes } from './modules/system/health.routes.js';
import { taskRoutes } from './modules/tasks/tasks.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { authPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerOpenApi } from './plugins/openapi.js';
import { createServices } from './services.js';

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

  await registerOpenApi(app);
  await app.register(authPlugin);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(
    async (api) => {
      api.addHook('onRequest', api.requireAuth);
      await api.register(userRoutes);
      await api.register(projectRoutes);
      await api.register(memberRoutes);
      await api.register(labelRoutes);
      await api.register(taskRoutes);
      await api.register(commentRoutes);
      await api.register(activityRoutes);
      await api.register(dashboardRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
