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
let member: TestClient;
let outsider: TestClient;
let projectId: string;

const isoDay = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function boardOrder(client: TestClient, status: string): Promise<string[]> {
  const res = await client.get(`/api/projects/${projectId}/board`);
  return res
    .json()
    .tasks.filter((t: { status: string }) => t.status === status)
    .map((t: { title: string }) => t.title);
}

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.db);
  owner = await registerUser(ctx.app, { name: 'Olga Vlastníková' });
  member = await registerUser(ctx.app, { name: 'Čeněk Člen' });
  outsider = await registerUser(ctx.app, { name: 'Cyril Cizí' });
  projectId = (await createProject(owner, { name: 'TeamFlow', key: 'TF' })).id;
  await addMember(owner, projectId, member);
});

describe('vytváření úkolů', () => {
  it('přiděluje identifikátory KLÍČ-ČÍSLO a výchozí hodnoty', async () => {
    const first = await createTask(owner, projectId, { title: 'První' });
    const second = await createTask(member, projectId, { title: 'Druhý', status: 'BACKLOG', priority: 'URGENT' });
    expect(first).toMatchObject({ key: 'TF-1', number: 1, status: 'TODO', priority: 'MEDIUM' });
    expect(second).toMatchObject({ key: 'TF-2', status: 'BACKLOG', priority: 'URGENT' });
    expect((await owner.get('/api/tasks/TF-2')).json().id).toBe((second as { id: string }).id);
    expect((await owner.get('/api/tasks/tf-2')).statusCode).toBe(200);
  });

  it('souběžné vytváření dává unikátní čísla', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createTask(owner, projectId, { title: `Souběžný ${i}` })),
    );
    const numbers = results.map((t) => t.number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('validuje vstup a vztahy', async () => {
    const empty = await owner.post(`/api/projects/${projectId}/tasks`, { title: '  ', dueDate: '2025-02-30' });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['title', 'dueDate']),
    );

    const foreignAssignee = await owner.post(`/api/projects/${projectId}/tasks`, {
      title: 'X',
      assigneeId: outsider.user!.id,
    });
    expect(foreignAssignee.statusCode).toBe(403);
    expect(foreignAssignee.json().error.code).toBe('ASSIGNEE_NOT_MEMBER');

    const otherProject = await createProject(outsider, { key: 'OTH' });
    const foreignLabel = (
      await outsider.post(`/api/projects/${otherProject.id}/labels`, { name: 'Cizí', color: '#2563EB' })
    ).json();
    const res = await owner.post(`/api/projects/${projectId}/tasks`, { title: 'X', labelIds: [foreignLabel.id] });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_LABELS');
  });

  it('nečlen nemůže vytvářet ani číst úkoly', async () => {
    const task = await createTask(owner, projectId);
    expect((await outsider.post(`/api/projects/${projectId}/tasks`, { title: 'X' })).statusCode).toBe(404);
    expect((await outsider.get(`/api/tasks/${task.id}`)).statusCode).toBe(404);
    expect((await outsider.get(`/api/tasks/${task.key}`)).statusCode).toBe(404);
    expect((await outsider.patch(`/api/tasks/${task.id}`, { title: 'Hack' })).statusCode).toBe(404);
    expect((await outsider.get(`/api/tasks?projectId=${projectId}`)).statusCode).toBe(404);
    expect((await outsider.get('/api/tasks')).json().total).toBe(0);
  });
});

describe('úpravy a historie', () => {
  it('změny se zapisují do historie a stav DONE nastaví datum dokončení', async () => {
    const task = await createTask(owner, projectId, { title: 'Původní' });
    const res = await member.patch(`/api/tasks/${task.id}`, {
      title: 'Upravený',
      status: 'DONE',
      priority: 'HIGH',
      assigneeId: member.user!.id,
      dueDate: '2030-01-15',
    });
    expect(res.statusCode).toBe(200);
    const updated = res.json();
    expect(updated).toMatchObject({ title: 'Upravený', status: 'DONE', priority: 'HIGH', dueDate: '2030-01-15' });
    expect(updated.completedAt).not.toBeNull();
    expect(updated.assignee.id).toBe(member.user!.id);

    const history = (await owner.get(`/api/tasks/${task.id}/history`)).json().items;
    expect(history[0].type).toBe('TASK_UPDATED');
    expect(history[0].actor.id).toBe(member.user!.id);
    expect(history[0].changes).toEqual(
      expect.arrayContaining([
        { field: 'title', from: 'Původní', to: 'Upravený' },
        { field: 'status', from: 'TODO', to: 'DONE' },
        { field: 'priority', from: 'MEDIUM', to: 'HIGH' },
        { field: 'assignee', from: null, to: 'Čeněk Člen' },
        { field: 'dueDate', from: null, to: '2030-01-15' },
      ]),
    );
    expect(history.at(-1).type).toBe('TASK_CREATED');

    const reopened = (await member.patch(`/api/tasks/${task.id}`, { status: 'IN_PROGRESS' })).json();
    expect(reopened.completedAt).toBeNull();
  });

  it('úprava beze změny nevytváří záznam v historii', async () => {
    const task = await createTask(owner, projectId, { title: 'Stejný' });
    await owner.patch(`/api/tasks/${task.id}`, { title: 'Stejný' });
    expect((await owner.get(`/api/tasks/${task.id}/history`)).json().items).toHaveLength(1);
  });

  it('smazat úkol smí autor nebo správce, ne jiný člen', async () => {
    const ownersTask = await createTask(owner, projectId, { title: 'Úkol vlastníka' });
    const membersTask = await createTask(member, projectId, { title: 'Úkol člena' });
    expect((await member.delete(`/api/tasks/${ownersTask.id}`)).statusCode).toBe(403);
    expect((await member.delete(`/api/tasks/${membersTask.id}`)).statusCode).toBe(204);
    expect((await owner.delete(`/api/tasks/${ownersTask.id}`)).statusCode).toBe(204);

    // Auditní záznam o smazání zůstává i bez úkolu.
    const activity = (await owner.get(`/api/projects/${projectId}/activity`)).json().items;
    expect(activity[0]).toMatchObject({
      type: 'TASK_DELETED',
      task: { id: null, key: 'TF-1', title: 'Úkol vlastníka' },
    });
  });
});

describe('Kanban – přesuny a pořadí', () => {
  it('přesun mezi sloupci a v rámci sloupce se trvale uloží', async () => {
    const a = await createTask(owner, projectId, { title: 'A' });
    const b = await createTask(owner, projectId, { title: 'B' });
    const c = await createTask(owner, projectId, { title: 'C' });
    expect(await boardOrder(owner, 'TODO')).toEqual(['A', 'B', 'C']);

    // C na začátek sloupce (před A).
    const moved = await member.post(`/api/tasks/${c.id}/move`, { status: 'TODO', prevId: null, nextId: a.id });
    expect(moved.statusCode).toBe(200);
    expect(await boardOrder(owner, 'TODO')).toEqual(['C', 'A', 'B']);

    // A do sloupce IN_PROGRESS (prázdný sloupec).
    await member.post(`/api/tasks/${a.id}/move`, { status: 'IN_PROGRESS', prevId: null, nextId: null });
    // B za A do IN_PROGRESS.
    await member.post(`/api/tasks/${b.id}/move`, { status: 'IN_PROGRESS', prevId: a.id, nextId: null });
    expect(await boardOrder(owner, 'TODO')).toEqual(['C']);
    expect(await boardOrder(owner, 'IN_PROGRESS')).toEqual(['A', 'B']);

    // B mezi… před A.
    await member.post(`/api/tasks/${b.id}/move`, { status: 'IN_PROGRESS', prevId: null, nextId: a.id });
    expect(await boardOrder(owner, 'IN_PROGRESS')).toEqual(['B', 'A']);

    const history = (await owner.get(`/api/tasks/${a.id}/history`)).json().items;
    expect(history[0]).toMatchObject({
      type: 'TASK_MOVED',
      changes: [{ field: 'status', from: 'TODO', to: 'IN_PROGRESS' }],
    });
  });

  it('přesun do DONE nastaví a přesun zpět zruší datum dokončení', async () => {
    const t = await createTask(owner, projectId, { title: 'Hotovo?' });
    const done = (await owner.post(`/api/tasks/${t.id}/move`, { status: 'DONE' })).json();
    expect(done.completedAt).not.toBeNull();
    const back = (await owner.post(`/api/tasks/${t.id}/move`, { status: 'REVIEW' })).json();
    expect(back.completedAt).toBeNull();
  });

  it('při vyčerpání mezery mezi pozicemi sloupec přečísluje', async () => {
    const a = await createTask(owner, projectId, { title: 'A' });
    const b = await createTask(owner, projectId, { title: 'B' });
    const c = await createTask(owner, projectId, { title: 'C' });
    await ctx.db.task.update({ where: { id: a.id }, data: { position: 1 } });
    await ctx.db.task.update({ where: { id: b.id }, data: { position: 1 + 1e-9 } });

    const res = await owner.post(`/api/tasks/${c.id}/move`, { status: 'TODO', prevId: a.id, nextId: b.id });
    expect(res.statusCode).toBe(200);
    expect(await boardOrder(owner, 'TODO')).toEqual(['A', 'C', 'B']);
    const positions = (await ctx.db.task.findMany({ orderBy: { position: 'asc' } })).map((t) => t.position);
    expect(new Set(positions).size).toBe(3);
  });

  it('neplatný požadavek na přesun je odmítnut', async () => {
    const a = await createTask(owner, projectId, { title: 'A' });
    expect((await owner.post(`/api/tasks/${a.id}/move`, { status: 'NEEXISTUJE' })).statusCode).toBe(400);
    expect((await outsider.post(`/api/tasks/${a.id}/move`, { status: 'DONE' })).statusCode).toBe(404);
  });
});

describe('seznam, filtrování a vyhledávání', () => {
  beforeEach(async () => {
    await createTask(owner, projectId, {
      title: 'Přihlášení přes Google',
      priority: 'HIGH',
      assigneeId: member.user!.id,
    });
    await createTask(owner, projectId, { title: 'Oprava exportu', priority: 'LOW', dueDate: isoDay(-3) });
    await createTask(owner, projectId, {
      title: 'Dokumentace API',
      description: 'Popsat autentizaci a stránkování',
      priority: 'URGENT',
      status: 'DONE',
      dueDate: isoDay(-5),
    });
    await createTask(member, projectId, { title: 'Výkon dashboardu', status: 'IN_PROGRESS', dueDate: isoDay(10) });
  });

  it('fulltext ignoruje diakritiku a hledá v popisu i podle prefixu', async () => {
    const titles = async (q: string) =>
      (await owner.get(`/api/tasks?q=${encodeURIComponent(q)}`)).json().items.map((t: { title: string }) => t.title);
    expect(await titles('prihlaseni')).toEqual(['Přihlášení přes Google']);
    expect(await titles('VÝKON dash')).toEqual(['Výkon dashboardu']);
    expect(await titles('stránkování')).toEqual(['Dokumentace API']);
    expect(await titles('TF-2')).toEqual(['Oprava exportu']);
    expect(await titles('neexistujícíslovo')).toEqual([]);
    expect(await titles("'); DROP TABLE tasks; --")).toEqual([]);
  });

  it('filtruje podle stavu, priority, řešitele a termínu', async () => {
    const titles = async (qs: string) =>
      (await owner.get(`/api/tasks?${qs}`))
        .json()
        .items.map((t: { title: string }) => t.title)
        .sort();
    expect(await titles('status=DONE')).toEqual(['Dokumentace API']);
    expect(await titles('status=TODO,IN_PROGRESS&priority=HIGH')).toEqual(['Přihlášení přes Google']);
    expect(await member.get('/api/tasks?assigneeId=me').then((r) => r.json().total)).toBe(1);
    expect(await titles('assigneeId=none')).toHaveLength(3);
    // Po termínu jsou jen nedokončené úkoly.
    expect(await titles('overdue=true')).toEqual(['Oprava exportu']);
  });

  it('řadí a stránkuje', async () => {
    const page1 = (await owner.get('/api/tasks?sort=priority&order=desc&pageSize=2&page=1')).json();
    expect(page1).toMatchObject({ total: 4, totalPages: 2, page: 1, pageSize: 2 });
    expect(page1.items.map((t: { priority: string }) => t.priority)).toEqual(['URGENT', 'HIGH']);
    const page2 = (await owner.get('/api/tasks?sort=priority&order=desc&pageSize=2&page=2')).json();
    expect(page2.items.map((t: { priority: string }) => t.priority)).toEqual(['MEDIUM', 'LOW']);

    const byDue = (await owner.get('/api/tasks?sort=dueDate&order=asc')).json().items;
    expect(byDue.at(-1).dueDate).toBeNull();
  });

  it('odmítne neplatné parametry dotazu', async () => {
    expect((await owner.get('/api/tasks?pageSize=1000')).statusCode).toBe(400);
    expect((await owner.get('/api/tasks?sort=password')).statusCode).toBe(400);
    expect((await owner.get('/api/tasks?status=HOTOVO')).statusCode).toBe(400);
  });
});

describe('komentáře', () => {
  it('člen komentuje, upravit smí jen autor, mazat autor nebo správce', async () => {
    const task = await createTask(owner, projectId);
    const created = await member.post(`/api/tasks/${task.id}/comments`, { body: 'Podívám se na to.' });
    expect(created.statusCode).toBe(201);
    const comment = created.json();
    expect(comment).toMatchObject({ body: 'Podívám se na to.', edited: false });

    expect((await owner.patch(`/api/comments/${comment.id}`, { body: 'Cizí úprava' })).statusCode).toBe(403);
    expect((await outsider.patch(`/api/comments/${comment.id}`, { body: 'X' })).statusCode).toBe(404);
    expect((await member.patch(`/api/comments/${comment.id}`, { body: 'Upraveno' })).json().body).toBe('Upraveno');

    const ownComment = (await owner.post(`/api/tasks/${task.id}/comments`, { body: 'Od vlastníka' })).json();
    expect((await member.delete(`/api/comments/${ownComment.id}`)).statusCode).toBe(403);
    expect((await owner.delete(`/api/comments/${comment.id}`)).statusCode).toBe(204);

    const list = (await member.get(`/api/tasks/${task.id}/comments`)).json().items;
    expect(list.map((c: { body: string }) => c.body)).toEqual(['Od vlastníka']);
    expect((await owner.get(`/api/tasks/${task.id}`)).json().commentCount).toBe(1);
  });

  it('prázdný komentář je odmítnut', async () => {
    const task = await createTask(owner, projectId);
    expect((await owner.post(`/api/tasks/${task.id}/comments`, { body: '   ' })).statusCode).toBe(400);
  });
});
