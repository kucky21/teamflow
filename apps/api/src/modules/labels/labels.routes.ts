import {
  createLabelSchema,
  labelDto,
  labelParamsSchema,
  projectParamsSchema,
  updateLabelSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';

export const labelRoutes: FastifyPluginAsyncZod = async (app) => {
  const { labels } = app.services;

  app.get(
    '/projects/:projectId/labels',
    {
      schema: {
        tags: ['Labels'],
        summary: 'Štítky projektu',
        security: cookieSecurity,
        params: projectParamsSchema,
        response: { 200: z.object({ items: z.array(labelDto) }) },
      },
    },
    async (request) => ({ items: await labels.list(request.params.projectId, getAuth(request).user.id) }),
  );

  app.post(
    '/projects/:projectId/labels',
    {
      schema: {
        tags: ['Labels'],
        summary: 'Vytvoření štítku',
        security: cookieSecurity,
        params: projectParamsSchema,
        body: createLabelSchema,
        response: { 201: labelDto },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await labels.create(request.params.projectId, getAuth(request).user.id, request.body)),
  );

  app.patch(
    '/projects/:projectId/labels/:labelId',
    {
      schema: {
        tags: ['Labels'],
        summary: 'Úprava štítku',
        security: cookieSecurity,
        params: labelParamsSchema,
        body: updateLabelSchema,
        response: { 200: labelDto },
      },
    },
    async (request) =>
      labels.update(request.params.projectId, request.params.labelId, getAuth(request).user.id, request.body),
  );

  app.delete(
    '/projects/:projectId/labels/:labelId',
    {
      schema: {
        tags: ['Labels'],
        summary: 'Smazání štítku',
        security: cookieSecurity,
        params: labelParamsSchema,
        response: noContent,
      },
    },
    async (request, reply) => {
      await labels.remove(request.params.projectId, request.params.labelId, getAuth(request).user.id);
      return reply.status(204).send(null);
    },
  );
};
