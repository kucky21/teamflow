import { errorBodyDto } from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Stav služby a databáze',
        response: {
          200: z.object({ status: z.literal('ok'), database: z.literal('ok') }),
          503: errorBodyDto,
        },
      },
    },
    async (request, reply) => {
      try {
        await app.db.$queryRaw`SELECT 1`;
        return { status: 'ok' as const, database: 'ok' as const };
      } catch (error) {
        request.log.error({ err: error }, 'Health check: databáze nedostupná');
        return reply.status(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Databáze není dostupná.' } });
      }
    },
  );
};
