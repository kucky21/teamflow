import {
  createProjectSchema,
  projectDetailDto,
  projectListQuerySchema,
  projectParamsSchema,
  projectSummaryDto,
  updateProjectSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';

export const projectRoutes: FastifyPluginAsyncZod = async (app) => {
  const { projects } = app.services;

  app.get(
    '/projects',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Projekty, kde je uživatel členem',
        security: cookieSecurity,
        querystring: projectListQuerySchema,
        response: { 200: z.object({ items: z.array(projectSummaryDto) }) },
      },
    },
    async (request) => ({
      items: await projects.list(getAuth(request).user.id, { archived: request.query.archived }),
    }),
  );

  app.post(
    '/projects',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Vytvoření projektu (autor se stane vlastníkem a administrátorem)',
        security: cookieSecurity,
        body: createProjectSchema,
        response: { 201: projectDetailDto },
      },
    },
    async (request, reply) => reply.status(201).send(await projects.create(getAuth(request).user.id, request.body)),
  );

  app.get(
    '/projects/:projectId',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Detail projektu včetně členů a štítků',
        security: cookieSecurity,
        params: projectParamsSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.get(request.params.projectId, getAuth(request).user.id),
  );

  app.patch(
    '/projects/:projectId',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Úprava projektu (administrátor, manažer)',
        security: cookieSecurity,
        params: projectParamsSchema,
        body: updateProjectSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.update(request.params.projectId, getAuth(request).user.id, request.body),
  );

  app.post(
    '/projects/:projectId/archive',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Archivace projektu (administrátor)',
        security: cookieSecurity,
        params: projectParamsSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.setArchived(request.params.projectId, getAuth(request).user.id, true),
  );

  app.post(
    '/projects/:projectId/unarchive',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Obnovení projektu z archivu (administrátor)',
        security: cookieSecurity,
        params: projectParamsSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.setArchived(request.params.projectId, getAuth(request).user.id, false),
  );

  app.delete(
    '/projects/:projectId',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Trvalé smazání archivovaného projektu (administrátor)',
        security: cookieSecurity,
        params: projectParamsSchema,
        response: noContent,
      },
    },
    async (request, reply) => {
      await projects.remove(request.params.projectId, getAuth(request).user.id);
      return reply.status(204).send(null);
    },
  );
};
