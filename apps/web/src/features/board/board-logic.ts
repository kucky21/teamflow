import { type Task, TASK_STATUSES, type TaskStatus } from '@teamflow/shared';

/*
 * Čistá logika Kanbanu – sdílená mezi drag & drop a optimistickou aktualizací.
 * Zrcadlí výpočet pozice na serveru (apps/api/src/domain/ordering.ts),
 * aby se karta po puštění okamžitě ukázala tam, kam ji server uloží.
 */

const STEP = 1024;

export interface MoveInput {
  taskId: string;
  status: TaskStatus;
  prevId: string | null;
  nextId: string | null;
}

export function byPosition(a: Pick<Task, 'position' | 'id'>, b: Pick<Task, 'position' | 'id'>): number {
  return a.position - b.position || a.id.localeCompare(b.id);
}

export function groupByStatus(tasks: readonly Task[]): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as Task[]])) as Record<TaskStatus, Task[]>;
  for (const task of tasks) groups[task.status].push(task);
  for (const status of TASK_STATUSES) groups[status].sort(byPosition);
  return groups;
}

function between(prev: number | null, next: number | null): number {
  if (prev === null) return next === null ? STEP : next - STEP;
  if (next === null) return prev + STEP;
  return prev + (next - prev) / 2;
}

export function applyOptimisticMove(tasks: readonly Task[], move: MoveInput, now = new Date()): Task[] {
  const moving = tasks.find((t) => t.id === move.taskId);
  if (!moving) return [...tasks];
  const column = tasks.filter((t) => t.status === move.status && t.id !== move.taskId).sort(byPosition);

  let prev: Task | null;
  let next: Task | null = null;
  const prevIndex = move.prevId ? column.findIndex((t) => t.id === move.prevId) : -1;
  const nextIndex = move.nextId ? column.findIndex((t) => t.id === move.nextId) : -1;
  if (prevIndex !== -1) {
    prev = column[prevIndex] ?? null;
    next = column[prevIndex + 1] ?? null;
  } else if (nextIndex !== -1) {
    prev = column[nextIndex - 1] ?? null;
    next = column[nextIndex] ?? null;
  } else {
    prev = column[column.length - 1] ?? null;
  }

  const position = between(prev?.position ?? null, next?.position ?? null);
  const completedAt =
    move.status === 'DONE' ? (moving.status === 'DONE' ? moving.completedAt : now.toISOString()) : null;

  return tasks.map((t) => (t.id === move.taskId ? { ...t, status: move.status, position, completedAt } : t));
}

/**
 * Z uspořádání sloupců po skončení tažení odvodí parametry pro API.
 * Vrací `null`, pokud se karta fakticky nepohnula.
 */
export function resolveDrop(
  original: Record<TaskStatus, string[]>,
  current: Record<TaskStatus, string[]>,
  taskId: string,
): MoveInput | null {
  const status = TASK_STATUSES.find((s) => current[s].includes(taskId));
  if (!status) return null;
  const column = current[status];
  const index = column.indexOf(taskId);
  const originalStatus = TASK_STATUSES.find((s) => original[s].includes(taskId));
  if (originalStatus === status && original[status].indexOf(taskId) === index) return null;
  return {
    taskId,
    status,
    prevId: column[index - 1] ?? null,
    nextId: column[index + 1] ?? null,
  };
}
