import type { onRequestHookHandler } from 'fastify';

import type { AppConfig } from './config/env.js';
import type { Db } from './lib/prisma.js';
import type { Services } from './services.js';

export interface AuthContext {
  user: { id: string; name: string; email: string; avatarColor: string; createdAt: Date };
  sessionId: string;
  csrfToken: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    db: Db;
    services: Services;
    /** Hook, který odmítne nepřihlášený požadavek (401). */
    requireAuth: onRequestHookHandler;
  }

  interface FastifyRequest {
    auth: AuthContext | null;
  }
}
