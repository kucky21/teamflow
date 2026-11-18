import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  addMember,
  createProject,
  createTask,
  createTestContext,
  registerUser,
  resetDatabase,
  type TestClient,
  type TestContext,
} from '../support/helpers.js';

let ctx: TestContext;
let owner: TestClient;
let manager: TestClient;
let member: TestClient;
let outsider: TestClient;
let projectId: string;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.db);
  owner = await registerUser(ctx.app, { name: 'Olga Vlastníková' });
  manager = await registerUser(ctx.app, { name: 'Marek Manažer' });
  member = await registerUser(ctx.app, { name: 'Čeněk Člen' });
  outsider = await registerUser(ctx.app, { name: 'Cyril Cizí' });
  projectId = (await createProject(owner, { name: 'Webový portál', key: 'web' })).id;
  await addMember(owner, projectId, manager, 'PROJECT_MANAGER');
  await addMember(owner, projectId, member, 'MEMBER');
});

describe('CRUD projektů', () => {
  it('autor je vlastníkem a administrátorem, klíč je velkými písmeny', async () => {
    const res = await owner.get(`/api/projects/${projectId}`);
    expect(res.statusCode).toBe(200);
    const project = res.json();
    expect(project.key).toBe('WEB');
    expect(project.owner.id).toBe(owner.user!.id);
    expect(project.myRole).toBe('ADMIN');
    expect(project.members).toHaveLength(3);
    expect(project.taskCounts).toEqual({ total: 0, open: 0, done: 0, overdue: 0 });
  });

  it('duplicitní klíč projektu vrací 409', async () => {
    const res = await owner.post('/api/projects', { name: 'Jiný', key: 'WEB', color: '#2563EB', icon: 'rocket' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('PROJECT_KEY_TAKEN');
  });

  it('seznam obsahuje jen projekty, kde je uživatel členem', async () => {
    await createProject(outsider, { name: 'Tajný projekt', key: 'SEC' });
    const mine = (await member.get('/api/projects')).json().items.map((p: { key: string }) => p.key);
    expect(mine).toEqual(['WEB']);
    const theirs = (await outsider.get('/api/projects')).json().items.map((p: { key: string }) => p.key);
    expect(theirs).toEqual(['SEC']);
  });

  it('nečlen dostane 404 a nezjistí existenci projektu', async () => {
    const res = await outsider.get(`/api/projects/${projectId}`);
    expect(res.statusCode).toBe(404);
    expect((await outsider.get(`/api/projects/${projectId}/board`)).statusCode).toBe(404);
    expect((await outsider.patch(`/api/projects/${projectId}`, { name: 'Hack' })).statusCode).toBe(404);
  });

  it('úpravu smí manažer, ale ne člen; změna se zapíše do aktivit', async () => {
    expect((await member.patch(`/api/projects/${projectId}`, { name: 'Zkouška' })).statusCode).toBe(403);
    const res = await manager.patch(`/api/projects/${projectId}`, { name: 'Nový portál', status: 'ON_HOLD' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: 'Nový portál', status: 'ON_HOLD' });

    const activity = (await member.get(`/api/projects/${projectId}/activity`)).json().items;
    expect(activity[0].type).toBe('PROJECT_UPDATED');
    expect(activity[0].changes).toEqual(
      expect.arrayContaining([{ field: 'name', from: 'Webový portál', to: 'Nový portál' }]),
    );
  });
});

describe('členové a role', () => {
  it('manažer nesmí jmenovat administrátora ani měnit roli administrátora', async () => {
    const extra = await registerUser(ctx.app);
    const res = await manager.post(`/api/projects/${projectId}/members`, { userId: extra.user!.id, role: 'ADMIN' });
    expect(res.statusCode).toBe(403);
    expect((await manager.post(`/api/projects/${projectId}/members`, { userId: extra.user!.id })).statusCode).toBe(201);
    expect(
      (await manager.patch(`/api/projects/${projectId}/members/${owner.user!.id}`, { role: 'MEMBER' })).statusCode,
    ).toBe(409);
  });

  it('člen nesmí spravovat členy', async () => {
    const extra = await registerUser(ctx.app);
    expect((await member.post(`/api/projects/${projectId}/members`, { userId: extra.user!.id })).statusCode).toBe(403);
    expect((await member.delete(`/api/projects/${projectId}/members/${manager.user!.id}`)).statusCode).toBe(403);
  });

  it('nelze přidat existujícího člena ani odebrat vlastníka', async () => {
    expect((await owner.post(`/api/projects/${projectId}/members`, { userId: member.user!.id })).statusCode).toBe(409);
    const res = await manager.delete(`/api/projects/${projectId}/members/${owner.user!.id}`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('OWNER_CANNOT_BE_REMOVED');
  });

  it('změna role se projeví v oprávněních', async () => {
    expect((await member.patch(`/api/projects/${projectId}`, { name: 'X1' })).statusCode).toBe(403);
    await owner.patch(`/api/projects/${projectId}/members/${member.user!.id}`, { role: 'PROJECT_MANAGER' });
    expect((await member.patch(`/api/projects/${projectId}`, { name: 'X1' })).statusCode).toBe(200);
  });

  it('odebrání člena uvolní jeho úkoly a odebere mu přístup', async () => {
    const task = await createTask(owner, projectId, { title: 'Přiřazený', assigneeId: member.user!.id });
    expect((await owner.delete(`/api/projects/${projectId}/members/${member.user!.id}`)).statusCode).toBe(204);
    expect((await owner.get(`/api/tasks/${task.id}`)).json().assignee).toBeNull();
    expect((await member.get(`/api/projects/${projectId}`)).statusCode).toBe(404);
  });

  it('člen může projekt sám opustit', async () => {
    expect((await member.delete(`/api/projects/${projectId}/members/${member.user!.id}`)).statusCode).toBe(204);
    expect((await member.get('/api/projects')).json().items).toHaveLength(0);
  });

  it('vyhledávání uživatelů vynechá stávající členy', async () => {
    const res = await owner.get(`/api/users?excludeProjectId=${projectId}`);
    expect(res.statusCode).toBe(200);
    const ids = res.json().items.map((u: { id: string }) => u.id);
    expect(ids).toContain(outsider.user!.id);
    expect(ids).not.toContain(member.user!.id);
    expect((await member.get(`/api/users?excludeProjectId=${projectId}`)).statusCode).toBe(403);
  });
});

describe('archivace a mazání', () => {
  it('archivovat smí jen administrátor; archivovaný projekt je jen pro čtení', async () => {
    const task = await createTask(member, projectId, { title: 'Před archivací' });
    expect((await manager.post(`/api/projects/${projectId}/archive`)).statusCode).toBe(403);
    const archived = await owner.post(`/api/projects/${projectId}/archive`);
    expect(archived.statusCode).toBe(200);
    expect(archived.json().archivedAt).not.toBeNull();

    const create = await member.post(`/api/projects/${projectId}/tasks`, { title: 'Po archivaci' });
    expect(create.statusCode).toBe(409);
    expect(create.json().error.code).toBe('PROJECT_ARCHIVED');
    expect((await member.patch(`/api/tasks/${task.id}`, { title: 'Změna' })).statusCode).toBe(409);
    expect((await member.get(`/api/tasks/${task.id}`)).statusCode).toBe(200);

    // Archivované projekty nejsou ve výchozím seznamu.
    expect((await member.get('/api/projects')).json().items).toHaveLength(0);
    expect((await member.get('/api/projects?archived=true')).json().items).toHaveLength(1);

    expect((await owner.post(`/api/projects/${projectId}/unarchive`)).statusCode).toBe(200);
    expect((await member.patch(`/api/tasks/${task.id}`, { title: 'Změna' })).statusCode).toBe(200);
  });

  it('smazat lze jen archivovaný projekt a smazání je kaskádové', async () => {
    const task = await createTask(owner, projectId, { title: 'Smaže se' });
    await owner.post(`/api/tasks/${task.id}/comments`, { body: 'Komentář' });

    const notArchived = await owner.delete(`/api/projects/${projectId}`);
    expect(notArchived.statusCode).toBe(409);
    expect(notArchived.json().error.code).toBe('PROJECT_NOT_ARCHIVED');

    await owner.post(`/api/projects/${projectId}/archive`);
    expect((await manager.delete(`/api/projects/${projectId}`)).statusCode).toBe(403);
    expect((await owner.delete(`/api/projects/${projectId}`)).statusCode).toBe(204);

    expect(await ctx.db.task.count()).toBe(0);
    expect(await ctx.db.taskComment.count()).toBe(0);
    expect(await ctx.db.projectMember.count()).toBe(0);
    expect(await ctx.db.activityLog.count()).toBe(0);
    expect(await ctx.db.user.count()).toBe(4);
  });
});

describe('štítky', () => {
  it('spravovat štítky smí manažer, člen je jen používá', async () => {
    expect((await member.post(`/api/projects/${projectId}/labels`, { name: 'Bug', color: '#E11D48' })).statusCode).toBe(
      403,
    );
    const created = await manager.post(`/api/projects/${projectId}/labels`, { name: 'Bug', color: '#E11D48' });
    expect(created.statusCode).toBe(201);
    const dup = await manager.post(`/api/projects/${projectId}/labels`, { name: 'Bug', color: '#2563EB' });
    expect(dup.statusCode).toBe(409);

    const task = await createTask(member, projectId, { labelIds: [created.json().id] });
    expect((await member.get(`/api/tasks/${task.id}`)).json().labels).toHaveLength(1);

    expect((await manager.delete(`/api/projects/${projectId}/labels/${created.json().id}`)).statusCode).toBe(204);
    expect((await member.get(`/api/tasks/${task.id}`)).json().labels).toHaveLength(0);
  });
});
