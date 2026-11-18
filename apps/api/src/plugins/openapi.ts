import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE } from '../modules/auth/session.service.js';

/** OpenAPI `security` pro endpointy vyžadující přihlášení. */
export const cookieSecurity = [{ cookieAuth: [] }];

/** Odpověď bez těla (204 No Content). */
export const noContent = { 204: z.null().describe('Bez obsahu') };

const TAGS = [
  { name: 'Auth', description: 'Registrace, přihlášení a relace' },
  { name: 'Users', description: 'Profil a vyhledávání uživatelů' },
  { name: 'Projects', description: 'Správa projektů' },
  { name: 'Members', description: 'Členové projektu a role' },
  { name: 'Labels', description: 'Štítky projektu' },
  { name: 'Tasks', description: 'Úkoly a Kanban' },
  { name: 'Comments', description: 'Komentáře k úkolům' },
  { name: 'Activity', description: 'Auditní log a historie změn' },
  { name: 'Dashboard', description: 'Agregovaná data' },
  { name: 'System', description: 'Provozní endpointy' },
];

/** OpenAPI 3.1 specifikace generovaná ze Zod schémat a Swagger UI na `/api/docs`. */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'TeamFlow API',
        description:
          `REST API aplikace TeamFlow. Autentizace probíhá HttpOnly cookie \`${SESSION_COOKIE}\`; ` +
          `zápisové požadavky přihlášeného uživatele musí obsahovat hlavičku \`${CSRF_HEADER}\` ` +
          `s hodnotou z cookie \`${CSRF_COOKIE}\`.`,
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE },
        },
      },
      tags: TAGS,
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs', staticCSP: true });
}
