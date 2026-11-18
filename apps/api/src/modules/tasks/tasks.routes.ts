import {
  boardDto,
  boardQuerySchema,
  createTaskSchema,
  moveTaskSchema,
  projectTaskParamsSchema,
  taskDetailDto,
  taskDto,
  taskListQuerySchema,
  taskPageDto,
  taskParamsSchema,
  updateTaskSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { getAuth } from '../../plugins/auth.js';
import { cookieSecurity, noContent } from '../../plugins/openapi.js';

export const taskRoutes: FastifyPluginAsyncZod = async (app) => {
  const { tasks } = app.services;

  app.get(
    '/tasks',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Seznam úkolů s filtrováním, fulltextem, řazením a stránkováním',
        security: cookieSecurity,
        querystring: taskListQuerySchema,
        response: { 200: taskPageDto },
      },
    },
    async (request) => tasks.list(getAuth(request).user.id, request.query),
  );

  app.get(
    '/projects/:projectId/board',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Úkoly projektu pro Kanban (seřazené podle pozice)',
        security: cookieSecurity,
        params: projectTaskParamsSchema,
        querystring: boardQuerySchema,
        response: { 200: boardDto },
      },
    },
    async (request) => tasks.board(request.params.projectId, getAuth(request).user.id, request.query),
  );

  app.post(
    '/projects/:projectId/tasks',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Vytvoření úkolu',
        security: cookieSecurity,
        params: projectTaskParamsSchema,
        body: createTaskSchema,
        response: { 201: taskDetailDto },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await tasks.create(request.params.projectId, getAuth(request).user.id, request.body)),
  );

  app.get(
    '/tasks/:taskId',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Detail úkolu (podle UUID nebo klíče, např. TF-104)',
        security: cookieSecurity,
        params: taskParamsSchema,
        response: { 200: taskDetailDto },
      },
    },
    async (request) => tasks.get(request.params.taskId, getAuth(request).user.id),
  );

  app.patch(
    '/tasks/:taskId',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Úprava úkolu (změny se zapisují do historie)',
        security: cookieSecurity,
        params: taskParamsSchema,
        body: updateTaskSchema,
        response: { 200: taskDetailDto },
      },
    },
    async (request) => tasks.update(request.params.taskId, getAuth(request).user.id, request.body),
  );

  app.post(
    '/tasks/:taskId/move',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Přesun úkolu na Kanbanu (sloupec a pořadí)',
        security: cookieSecurity,
        params: taskParamsSchema,
        body: moveTaskSchema,
        response: { 200: taskDto },
      },
    },
    async (request) => tasks.move(request.params.taskId, getAuth(request).user.id, request.body),
  );

  app.delete(
    '/tasks/:taskId',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Smazání úkolu (autor nebo správce projektu)',
        security: cookieSecurity,
        params: taskParamsSchema,
        response: noContent,
      },
    },
    async (request, reply) => {
      await tasks.remove(request.params.taskId, getAuth(request).user.id);
      return reply.status(204).send(null);
    },
  );
};
