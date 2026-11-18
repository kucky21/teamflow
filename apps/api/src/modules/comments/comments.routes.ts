import {
  commentDto,
  commentParamsSchema,
  createCommentSchema,
  taskParamsSchema,
  updateCommentSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';

export const commentRoutes: FastifyPluginAsyncZod = async (app) => {
  const { comments } = app.services;

  app.get(
    '/tasks/:taskId/comments',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Komentáře k úkolu',
        security: cookieSecurity,
        params: taskParamsSchema,
        response: { 200: z.object({ items: z.array(commentDto) }) },
      },
    },
    async (request) => ({ items: await comments.list(request.params.taskId, getAuth(request).user.id) }),
  );

  app.post(
    '/tasks/:taskId/comments',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Přidání komentáře',
        security: cookieSecurity,
        params: taskParamsSchema,
        body: createCommentSchema,
        response: { 201: commentDto },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await comments.create(request.params.taskId, getAuth(request).user.id, request.body.body)),
  );

  app.patch(
    '/comments/:commentId',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Úprava vlastního komentáře',
        security: cookieSecurity,
        params: commentParamsSchema,
        body: updateCommentSchema,
        response: { 200: commentDto },
      },
    },
    async (request) => comments.update(request.params.commentId, getAuth(request).user.id, request.body.body),
  );

  app.delete(
    '/comments/:commentId',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Smazání komentáře (autor nebo správce projektu)',
        security: cookieSecurity,
        params: commentParamsSchema,
        response: noContent,
      },
    },
    async (request, reply) => {
      await comments.remove(request.params.commentId, getAuth(request).user.id);
      return reply.status(204).send(null);
    },
  );
};
