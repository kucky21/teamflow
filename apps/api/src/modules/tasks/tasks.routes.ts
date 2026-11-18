import {
  activityPageDto,
  activityQuerySchema,
  boardDto,
  boardQuerySchema,
  commentDto,
  commentParamsSchema,
  createCommentSchema,
  createTaskSchema,
  moveTaskSchema,
  projectTaskParamsSchema,
  taskDetailDto,
  taskDto,
  taskListQuerySchema,
  taskPageDto,
  taskParamsSchema,
  updateCommentSchema,
  updateTaskSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getAuth } from '../../plugins/auth.js';

const security = [{ cookieAuth: [] }];

export const taskRoutes: FastifyPluginAsyncZod = async (app) => {
  const { tasks, comments, activity } = app.services;

  app.get(
    '/tasks',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Seznam úkolů s filtrováním, fulltextem, řazením a stránkováním',
        security,
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
        security,
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
        security,
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
        security,
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
        security,
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
        security,
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
        security,
        params: taskParamsSchema,
      },
    },
    async (request, reply) => {
      await tasks.remove(request.params.taskId, getAuth(request).user.id);
      return reply.status(204).send();
    },
  );

  app.get(
    '/tasks/:taskId/history',
    {
      schema: {
        tags: ['Activity'],
        summary: 'Historie změn úkolu',
        security,
        params: taskParamsSchema,
        querystring: activityQuerySchema,
        response: { 200: activityPageDto },
      },
    },
    async (request) => activity.listForTask(request.params.taskId, getAuth(request).user.id, request.query),
  );

  // ------------------------------------------------------------ komentáře

  app.get(
    '/tasks/:taskId/comments',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Komentáře k úkolu',
        security,
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
        security,
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
        security,
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
        security,
        params: commentParamsSchema,
      },
    },
    async (request, reply) => {
      await comments.remove(request.params.commentId, getAuth(request).user.id);
      return reply.status(204).send();
    },
  );
};
