import {
  changePasswordSchema,
  currentUserDto,
  updateProfileSchema,
  userSearchQuerySchema,
  userSummaryDto,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';
import { passwordRateLimit } from '../auth/rate-limit.js';

/** Endpointy přihlášeného uživatele – registrují se v chráněném kontextu (requireAuth). */
export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  const { users, auth } = app.services;

  app.patch(
    '/users/me',
    {
      schema: {
        tags: ['Users'],
        summary: 'Úprava vlastního profilu',
        security: cookieSecurity,
        body: updateProfileSchema,
        response: { 200: z.object({ user: currentUserDto }) },
      },
    },
    async (request) => ({ user: await users.updateProfile(getAuth(request).user.id, request.body) }),
  );

  app.post(
    '/users/me/password',
    {
      config: { rateLimit: passwordRateLimit(app.config) },
      schema: {
        tags: ['Users'],
        summary: 'Změna hesla (odhlásí ostatní relace)',
        security: cookieSecurity,
        body: changePasswordSchema,
        response: noContent,
      },
    },
    async (request, reply) => {
      const { user, sessionId } = getAuth(request);
      await auth.changePassword(user.id, sessionId, request.body);
      return reply.status(204).send(null);
    },
  );

  app.get(
    '/users',
    {
      schema: {
        tags: ['Users'],
        summary: 'Vyhledání uživatelů (např. pro přidání do projektu)',
        security: cookieSecurity,
        querystring: userSearchQuerySchema,
        response: { 200: z.object({ items: z.array(userSummaryDto) }) },
      },
    },
    async (request) => ({ items: await users.search(getAuth(request).user.id, request.query) }),
  );
};
