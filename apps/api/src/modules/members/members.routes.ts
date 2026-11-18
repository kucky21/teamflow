import {
  addMemberSchema,
  memberDto,
  memberParamsSchema,
  projectParamsSchema,
  updateMemberSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';

export const memberRoutes: FastifyPluginAsyncZod = async (app) => {
  const { members } = app.services;

  app.get(
    '/projects/:projectId/members',
    {
      schema: {
        tags: ['Members'],
        summary: 'Členové projektu',
        security: cookieSecurity,
        params: projectParamsSchema,
        response: { 200: z.object({ items: z.array(memberDto) }) },
      },
    },
    async (request) => ({ items: await members.list(request.params.projectId, getAuth(request).user.id) }),
  );

  app.post(
    '/projects/:projectId/members',
    {
      schema: {
        tags: ['Members'],
        summary: 'Přidání člena',
        security: cookieSecurity,
        params: projectParamsSchema,
        body: addMemberSchema,
        response: { 201: memberDto },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await members.add(request.params.projectId, getAuth(request).user.id, request.body)),
  );

  app.patch(
    '/projects/:projectId/members/:userId',
    {
      schema: {
        tags: ['Members'],
        summary: 'Změna role člena',
        security: cookieSecurity,
        params: memberParamsSchema,
        body: updateMemberSchema,
        response: { 200: memberDto },
      },
    },
    async (request) =>
      members.updateRole(request.params.projectId, getAuth(request).user.id, request.params.userId, request.body.role),
  );

  app.delete(
    '/projects/:projectId/members/:userId',
    {
      schema: {
        tags: ['Members'],
        summary: 'Odebrání člena (nebo opuštění projektu)',
        security: cookieSecurity,
        params: memberParamsSchema,
        response: noContent,
      },
    },
    async (request, reply) => {
      await members.remove(request.params.projectId, getAuth(request).user.id, request.params.userId);
      return reply.status(204).send(null);
    },
  );
};
