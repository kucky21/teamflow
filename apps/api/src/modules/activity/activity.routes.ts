import { activityPageDto, activityQuerySchema, projectParamsSchema, taskParamsSchema } from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity } from '../../plugins/openapi.js';

export const activityRoutes: FastifyPluginAsyncZod = async (app) => {
  const { activity } = app.services;

  app.get(
    '/projects/:projectId/activity',
    {
      schema: {
        tags: ['Activity'],
        summary: 'Auditní log projektu (kurzorové stránkování)',
        security: cookieSecurity,
        params: projectParamsSchema,
        querystring: activityQuerySchema,
        response: { 200: activityPageDto },
      },
    },
    async (request) => activity.listForProject(request.params.projectId, getAuth(request).user.id, request.query),
  );

  app.get(
    '/tasks/:taskId/history',
    {
      schema: {
        tags: ['Activity'],
        summary: 'Historie změn úkolu',
        security: cookieSecurity,
        params: taskParamsSchema,
        querystring: activityQuerySchema,
        response: { 200: activityPageDto },
      },
    },
    async (request) => activity.listForTask(request.params.taskId, getAuth(request).user.id, request.query),
  );
};
