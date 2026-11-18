import {
  activityPageDto,
  activityQuerySchema,
  addMemberSchema,
  createLabelSchema,
  createProjectSchema,
  labelDto,
  labelParamsSchema,
  memberDto,
  memberParamsSchema,
  projectDetailDto,
  projectListQuerySchema,
  projectParamsSchema,
  projectSummaryDto,
  updateLabelSchema,
  updateMemberSchema,
  updateProjectSchema,
} from '@teamflow/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getAuth } from '../../plugins/auth.js';

const security = [{ cookieAuth: [] }];

export const projectRoutes: FastifyPluginAsyncZod = async (app) => {
  const { projects, members, labels, activity } = app.services;

  // ------------------------------------------------------------ projekty

  app.get(
    '/projects',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Projekty, kde je uživatel členem',
        security,
        querystring: projectListQuerySchema,
        response: { 200: z.object({ items: z.array(projectSummaryDto) }) },
      },
    },
    async (request) => ({
      items: await projects.list(getAuth(request).user.id, { archived: request.query.archived }),
    }),
  );

  app.post(
    '/projects',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Vytvoření projektu (autor se stane vlastníkem a administrátorem)',
        security,
        body: createProjectSchema,
        response: { 201: projectDetailDto },
      },
    },
    async (request, reply) => reply.status(201).send(await projects.create(getAuth(request).user.id, request.body)),
  );

  app.get(
    '/projects/:projectId',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Detail projektu včetně členů a štítků',
        security,
        params: projectParamsSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.get(request.params.projectId, getAuth(request).user.id),
  );

  app.patch(
    '/projects/:projectId',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Úprava projektu (administrátor, manažer)',
        security,
        params: projectParamsSchema,
        body: updateProjectSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.update(request.params.projectId, getAuth(request).user.id, request.body),
  );

  app.post(
    '/projects/:projectId/archive',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Archivace projektu (administrátor)',
        security,
        params: projectParamsSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.setArchived(request.params.projectId, getAuth(request).user.id, true),
  );

  app.post(
    '/projects/:projectId/unarchive',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Obnovení projektu z archivu (administrátor)',
        security,
        params: projectParamsSchema,
        response: { 200: projectDetailDto },
      },
    },
    async (request) => projects.setArchived(request.params.projectId, getAuth(request).user.id, false),
  );

  app.delete(
    '/projects/:projectId',
    {
      schema: {
        tags: ['Projects'],
        summary: 'Trvalé smazání archivovaného projektu (administrátor)',
        security,
        params: projectParamsSchema,
      },
    },
    async (request, reply) => {
      await projects.remove(request.params.projectId, getAuth(request).user.id);
      return reply.status(204).send();
    },
  );

  app.get(
    '/projects/:projectId/activity',
    {
      schema: {
        tags: ['Activity'],
        summary: 'Auditní log projektu (kurzorové stránkování)',
        security,
        params: projectParamsSchema,
        querystring: activityQuerySchema,
        response: { 200: activityPageDto },
      },
    },
    async (request) => activity.listForProject(request.params.projectId, getAuth(request).user.id, request.query),
  );

  // ------------------------------------------------------------ členové

  app.get(
    '/projects/:projectId/members',
    {
      schema: {
        tags: ['Members'],
        summary: 'Členové projektu',
        security,
        params: projectParamsSchema,
        response: { 200: z.object({ items: z.array(memberDto) }) },
      },
    },
    async (request) => ({ items: await members.list(request.params.projectId, getAuth(request).user.id) }),
  );

  app.post(
    '/projects/:projectId/members',
    {
      schema: {
        tags: ['Members'],
        summary: 'Přidání člena',
        security,
        params: projectParamsSchema,
        body: addMemberSchema,
        response: { 201: memberDto },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await members.add(request.params.projectId, getAuth(request).user.id, request.body)),
  );

  app.patch(
    '/projects/:projectId/members/:userId',
    {
      schema: {
        tags: ['Members'],
        summary: 'Změna role člena',
        security,
        params: memberParamsSchema,
        body: updateMemberSchema,
        response: { 200: memberDto },
      },
    },
    async (request) =>
      members.updateRole(request.params.projectId, getAuth(request).user.id, request.params.userId, request.body.role),
  );

  app.delete(
    '/projects/:projectId/members/:userId',
    {
      schema: {
        tags: ['Members'],
        summary: 'Odebrání člena (nebo opuštění projektu)',
        security,
        params: memberParamsSchema,
      },
    },
    async (request, reply) => {
      await members.remove(request.params.projectId, getAuth(request).user.id, request.params.userId);
      return reply.status(204).send();
    },
  );

  // ------------------------------------------------------------ štítky

  app.get(
    '/projects/:projectId/labels',
    {
      schema: {
        tags: ['Labels'],
        summary: 'Štítky projektu',
        security,
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
        security,
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
        security,
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
        security,
        params: labelParamsSchema,
      },
    },
    async (request, reply) => {
      await labels.remove(request.params.projectId, request.params.labelId, getAuth(request).user.id);
      return reply.status(204).send();
    },
  );
};
