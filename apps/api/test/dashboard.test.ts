import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createProject,
  createTask,
  createTestContext,
  registerUser,
  resetDatabase,
  type TestClient,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
let user: TestClient;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.db);
  user = await registerUser(ctx.app);
});

describe('dashboard', () => {
  it('agreguje skutečná data jen z dostupných, nearchivovaných projektů', async () => {
    const active = await createProject(user, { key: 'ACT' });
    const archived = await createProject(user, { key: 'ARC' });
    await createProject(user, { key: 'PLN', status: 'PLANNING' });

    await createTask(user, active.id, { title: 'Otevřený', assigneeId: user.user!.id, dueDate: '2030-01-01' });
    await createTask(user, active.id, { title: 'Po termínu', dueDate: '2020-01-01' });
    await createTask(user, active.id, { title: 'Hotový dnes', status: 'DONE' });
    await createTask(user, archived.id, { title: 'V archivu' });
    await user.post(`/api/projects/${archived.id}/archive`);

    // Úkoly v cizím projektu se nesmí započítat.
    const stranger = await registerUser(ctx.app);
    const foreign = await createProject(stranger, { key: 'FOR' });
    await createTask(stranger, foreign.id, { title: 'Cizí', status: 'DONE' });

    const res = await user.get('/api/dashboard?tz=Europe/Prague');
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.stats).toEqual({
      activeProjects: 1,
      openTasks: 2,
      overdueTasks: 1,
      completedTasks: 1,
      completedLast30Days: 1,
    });

    expect(data.completedByDay).toHaveLength(30);
    expect(data.completedByDay.reduce((s: number, d: { count: number }) => s + d.count, 0)).toBe(1);
    expect(data.completedByDay.at(-1).count).toBe(1);

    const distribution = Object.fromEntries(
      data.statusDistribution.map((d: { status: string; count: number }) => [d.status, d.count]),
    );
    expect(distribution).toEqual({ BACKLOG: 0, TODO: 2, IN_PROGRESS: 0, REVIEW: 0, DONE: 1 });

    expect(data.myTasks.map((t: { title: string }) => t.title)).toEqual(['Otevřený']);
    expect(data.recentActivity.length).toBeGreaterThan(0);
    expect(data.recentActivity.every((a: { project: { key: string } }) => a.project.key !== 'FOR')).toBe(true);
  });

  it('odmítne neplatné časové pásmo', async () => {
    expect((await user.get('/api/dashboard?tz=Neplatne/Pasmo')).statusCode).toBe(400);
  });

  it('health endpoint ověřuje databázi', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.json()).toEqual({ status: 'ok', database: 'ok' });
  });

  it('OpenAPI specifikace obsahuje všechny hlavní endpointy', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/docs/json' });
    expect(res.statusCode).toBe(200);
    const paths = Object.keys(res.json().paths);
    expect(paths).toEqual(
      expect.arrayContaining(['/api/auth/login', '/api/projects', '/api/tasks/{taskId}/move', '/api/dashboard']),
    );
  });
});
