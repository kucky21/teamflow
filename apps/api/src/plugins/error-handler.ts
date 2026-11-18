import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';

import { AppError } from '../lib/errors.js';

const CONTEXT_MESSAGES: Record<string, string> = {
  body: 'Neplatná data požadavku – zkontrolujte zvýrazněná pole.',
  querystring: 'Neplatné parametry dotazu.',
  params: 'Neplatné parametry cesty.',
  headers: 'Neplatné hlavičky požadavku.',
};

/**
 * Jednotný formát chyb: `{ error: { code, message, details? } }`.
 * Neočekávané chyby se logují a klientovi se nevrací jejich detail.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const context = 'validationContext' in error ? (error.validationContext ?? '') : '';
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: CONTEXT_MESSAGES[context] ?? 'Neplatný požadavek.',
          details: error.validation.map((v) => ({
            path: v.instancePath.replace(/^\//, '').replaceAll('/', '.'),
            message: v.message ?? 'Neplatná hodnota',
          })),
        },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error, issues: error.cause.issues }, 'Odpověď neodpovídá schématu');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Došlo k neočekávané chybě serveru.' },
      });
    }

    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 400 && statusCode < 500) {
      // Chyby frameworku (nevalidní JSON, příliš velké tělo, nepodporovaný typ…).
      return reply.status(statusCode).send({
        error: {
          code: 'code' in error && typeof error.code === 'string' ? error.code : 'BAD_REQUEST',
          message: statusCode === 413 ? 'Požadavek je příliš velký.' : 'Neplatný požadavek.',
        },
      });
    }

    request.log.error({ err: error }, 'Neošetřená chyba');
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Došlo k neočekávané chybě serveru.' },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: { code: 'ROUTE_NOT_FOUND', message: `Endpoint ${request.method} ${request.url} neexistuje.` },
    });
  });
}
