import { dashboardDto, dashboardQuerySchema } from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity } from '../../plugins/openapi.js';

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/dashboard',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Agregovaná data pro úvodní přehled',
        security: cookieSecurity,
        querystring: dashboardQuerySchema,
        response: { 200: dashboardDto },
      },
    },
    async (request) => app.services.dashboard.get(getAuth(request).user.id, request.query.tz),
  );
};
