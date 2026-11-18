import { currentUserDto, loginSchema, registerSchema } from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { clearSessionCookies, getAuth, setSessionCookies } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';
import { toCurrentUser } from '../mappers.js';
import { passwordRateLimit } from './rate-limit.js';

const userResponse = z.object({ user: currentUserDto });

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { auth, sessions } = app.services;
  const rateLimit = passwordRateLimit(app.config);

  app.post(
    '/auth/register',
    {
      config: { rateLimit },
      schema: {
        tags: ['Auth'],
        summary: 'Registrace nového uživatele',
        body: registerSchema,
        response: { 201: userResponse },
      },
    },
    async (request, reply) => {
      const { user, session } = await auth.register(request.body, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
      setSessionCookies(reply, app.config, session);
      return reply.status(201).send({ user });
    },
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit },
      schema: {
        tags: ['Auth'],
        summary: 'Přihlášení',
        body: loginSchema,
        response: { 200: userResponse },
      },
    },
    async (request, reply) => {
      // Případnou předchozí relaci v tomto prohlížeči zneplatníme.
      if (request.auth) await sessions.revoke(request.auth.sessionId);
      const { user, session } = await auth.login(request.body, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
      setSessionCookies(reply, app.config, session);
      return { user };
    },
  );

  app.post(
    '/auth/logout',
    { schema: { tags: ['Auth'], summary: 'Odhlášení (zneplatní aktuální relaci)', response: noContent } },
    async (request, reply) => {
      if (request.auth) await sessions.revoke(request.auth.sessionId);
      clearSessionCookies(reply, app.config);
      return reply.status(204).send(null);
    },
  );

  app.get(
    '/auth/me',
    {
      onRequest: app.requireAuth,
      schema: {
        tags: ['Auth'],
        summary: 'Aktuálně přihlášený uživatel',
        security: cookieSecurity,
        response: { 200: userResponse },
      },
    },
    async (request) => ({ user: toCurrentUser(getAuth(request).user) }),
  );
};
