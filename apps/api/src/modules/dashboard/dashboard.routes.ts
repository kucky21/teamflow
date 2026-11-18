import { dashboardDto, dashboardQuerySchema } from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { getAuth } from '../../plugins/auth.js';

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/dashboard',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Agregovaná data pro úvodní přehled',
        security: [{ cookieAuth: [] }],
        querystring: dashboardQuerySchema,
        response: { 200: dashboardDto },
      },
    },
    async (request) => app.services.dashboard.get(getAuth(request).user.id, request.query.tz),
  );
};
