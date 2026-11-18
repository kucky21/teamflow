import {
  changePasswordSchema,
  currentUserDto,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  userSearchQuerySchema,
  userSummaryDto,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { clearSessionCookies, getAuth, setSessionCookies } from '../../plugins/auth.js';
import { toCurrentUser } from './auth.service.js';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { auth: authService, sessions } = app.services;
  const rateLimit = {
    max: app.config.authRateLimitMax,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req: unknown, ctx: { ttl: number }) =>
      new AppError(
        429,
        'RATE_LIMITED',
        `Příliš mnoho pokusů. Zkuste to znovu za ${Math.max(1, Math.ceil(ctx.ttl / 1000))} s.`,
      ),
  };

  app.post(
    '/auth/register',
    {
      config: { rateLimit },
      schema: {
        tags: ['Auth'],
        summary: 'Registrace nového uživatele',
        body: registerSchema,
        response: { 201: z.object({ user: currentUserDto }) },
      },
    },
    async (request, reply) => {
      const { user, session } = await authService.register(request.body, {
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
        response: { 200: z.object({ user: currentUserDto }) },
      },
    },
    async (request, reply) => {
      // Případnou předchozí relaci v tomto prohlížeči zneplatníme.
      if (request.auth) await sessions.revoke(request.auth.sessionId);
      const { user, session } = await authService.login(request.body, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
      setSessionCookies(reply, app.config, session);
      return { user };
    },
  );

  app.post(
    '/auth/logout',
    { schema: { tags: ['Auth'], summary: 'Odhlášení (zneplatní aktuální relaci)' } },
    async (request, reply) => {
      if (request.auth) await sessions.revoke(request.auth.sessionId);
      clearSessionCookies(reply, app.config);
      return reply.status(204).send();
    },
  );

  app.get(
    '/auth/me',
    {
      onRequest: app.requireAuth,
      schema: {
        tags: ['Auth'],
        summary: 'Aktuálně přihlášený uživatel',
        security: [{ cookieAuth: [] }],
        response: { 200: z.object({ user: currentUserDto }) },
      },
    },
    async (request) => ({ user: toCurrentUser(getAuth(request).user) }),
  );

  app.patch(
    '/users/me',
    {
      onRequest: app.requireAuth,
      schema: {
        tags: ['Users'],
        summary: 'Úprava vlastního profilu',
        security: [{ cookieAuth: [] }],
        body: updateProfileSchema,
        response: { 200: z.object({ user: currentUserDto }) },
      },
    },
    async (request) => ({ user: await authService.updateProfile(getAuth(request).user.id, request.body) }),
  );

  app.post(
    '/users/me/password',
    {
      onRequest: app.requireAuth,
      config: { rateLimit },
      schema: {
        tags: ['Users'],
        summary: 'Změna hesla (odhlásí ostatní relace)',
        security: [{ cookieAuth: [] }],
        body: changePasswordSchema,
      },
    },
    async (request, reply) => {
      const auth = getAuth(request);
      await authService.changePassword(auth.user.id, auth.sessionId, request.body);
      return reply.status(204).send();
    },
  );

  app.get(
    '/users',
    {
      onRequest: app.requireAuth,
      schema: {
        tags: ['Users'],
        summary: 'Vyhledání uživatelů (např. pro přidání do projektu)',
        security: [{ cookieAuth: [] }],
        querystring: userSearchQuerySchema,
        response: { 200: z.object({ items: z.array(userSummaryDto) }) },
      },
    },
    async (request) => ({ items: await authService.searchUsers(getAuth(request).user.id, request.query) }),
  );
};
