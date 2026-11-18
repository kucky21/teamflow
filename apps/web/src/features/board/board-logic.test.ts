import type { Task, TaskStatus } from '@teamflow/shared';
import { describe, expect, it } from 'vitest';

import { applyOptimisticMove, groupByStatus, resolveDrop } from './board-logic';

function task(id: string, status: TaskStatus, position: number, extra: Partial<Task> = {}): Task {
  return {
    id,
    key: `TF-${id}`,
    number: 1,
    project: { id: 'p', key: 'TF', name: 'TeamFlow', color: '#0EA5A4', icon: 'rocket' },
    title: `Úkol ${id}`,
    status,
    priority: 'MEDIUM',
    position,
    dueDate: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    completedAt: null,
    assignee: null,
    labels: [],
    commentCount: 0,
    ...extra,
  };
}

const columns = (partial: Partial<Record<TaskStatus, string[]>>): Record<TaskStatus, string[]> => ({
  BACKLOG: [],
  TODO: [],
  IN_PROGRESS: [],
  REVIEW: [],
  DONE: [],
  ...partial,
});

describe('groupByStatus', () => {
  it('seskupí úkoly do sloupců a seřadí je podle pozice', () => {
    const groups = groupByStatus([task('b', 'TODO', 2048), task('a', 'TODO', 1024), task('c', 'DONE', 10)]);
    expect(groups.TODO.map((t) => t.id)).toEqual(['a', 'b']);
    expect(groups.DONE.map((t) => t.id)).toEqual(['c']);
    expect(groups.BACKLOG).toEqual([]);
  });
});

describe('applyOptimisticMove', () => {
  const tasks = [task('a', 'TODO', 1024), task('b', 'TODO', 2048), task('c', 'IN_PROGRESS', 1024)];

  it('vloží úkol mezi sousedy v jiném sloupci', () => {
    const result = applyOptimisticMove(tasks, { taskId: 'c', status: 'TODO', prevId: 'a', nextId: 'b' });
    const moved = result.find((t) => t.id === 'c')!;
    expect(moved.status).toBe('TODO');
    expect(moved.position).toBe(1536);
    expect(groupByStatus(result).TODO.map((t) => t.id)).toEqual(['a', 'c', 'b']);
  });

  it('na začátek sloupce podle nextId', () => {
    const result = applyOptimisticMove(tasks, { taskId: 'b', status: 'TODO', prevId: null, nextId: 'a' });
    expect(groupByStatus(result).TODO.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('do prázdného sloupce a nastaví datum dokončení u DONE', () => {
    const now = new Date('2025-05-01T10:00:00.000Z');
    const result = applyOptimisticMove(tasks, { taskId: 'a', status: 'DONE', prevId: null, nextId: null }, now);
    const moved = result.find((t) => t.id === 'a')!;
    expect(moved).toMatchObject({ status: 'DONE', position: 1024, completedAt: now.toISOString() });
  });

  it('přesun z DONE zruší datum dokončení', () => {
    const done = [task('x', 'DONE', 1024, { completedAt: '2025-01-02T00:00:00.000Z' })];
    const result = applyOptimisticMove(done, { taskId: 'x', status: 'REVIEW', prevId: null, nextId: null });
    expect(result[0]!.completedAt).toBeNull();
  });

  it('nezmění vstupní pole (immutabilita)', () => {
    const snapshot = JSON.stringify(tasks);
    applyOptimisticMove(tasks, { taskId: 'a', status: 'DONE', prevId: null, nextId: null });
    expect(JSON.stringify(tasks)).toBe(snapshot);
  });
});

describe('resolveDrop', () => {
  const original = columns({ TODO: ['a', 'b', 'c'], DONE: ['d'] });

  it('vrátí null, když se karta nepohnula', () => {
    expect(resolveDrop(original, original, 'b')).toBeNull();
  });

  it('určí sousedy po přesunu v rámci sloupce', () => {
    expect(resolveDrop(original, columns({ TODO: ['b', 'a', 'c'], DONE: ['d'] }), 'b')).toEqual({
      taskId: 'b',
      status: 'TODO',
      prevId: null,
      nextId: 'a',
    });
  });

  it('určí cílový sloupec a sousedy po přesunu mezi sloupci', () => {
    expect(resolveDrop(original, columns({ TODO: ['a', 'c'], DONE: ['d', 'b'] }), 'b')).toEqual({
      taskId: 'b',
      status: 'DONE',
      prevId: 'd',
      nextId: null,
    });
  });
});
