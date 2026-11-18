import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@teamflow/shared';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

export interface TaskFilterState {
  q: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  assigneeId: string | undefined;
  labelId: string | undefined;
  overdue: boolean;
}

function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** Stav filtrů je uložen v URL – filtrovaný pohled lze sdílet odkazem. */
export function useTaskFilterParams() {
  const [params, setParams] = useSearchParams();
  const filters: TaskFilterState = useMemo(
    () => ({
      q: params.get('q') ?? '',
      status: parseList(params.get('status'), TASK_STATUSES),
      priority: parseList(params.get('priority'), TASK_PRIORITIES),
      assigneeId: params.get('assignee') ?? undefined,
      labelId: params.get('label') ?? undefined,
      overdue: params.get('overdue') === 'true',
    }),
    [params],
  );

  const update = (patch: Partial<TaskFilterState> & { page?: number; sort?: string; order?: string }) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const set = (key: string, value: string | undefined) => (value ? next.set(key, value) : next.delete(key));
        if ('q' in patch) set('q', patch.q?.trim() || undefined);
        if ('status' in patch) set('status', patch.status?.join(','));
        if ('priority' in patch) set('priority', patch.priority?.join(','));
        if ('assigneeId' in patch) set('assignee', patch.assigneeId);
        if ('labelId' in patch) set('label', patch.labelId);
        if ('overdue' in patch) set('overdue', patch.overdue ? 'true' : undefined);
        if ('sort' in patch) set('sort', patch.sort);
        if ('order' in patch) set('order', patch.order);
        // Změna filtru vrací na první stránku.
        set('page', patch.page && patch.page > 1 ? String(patch.page) : undefined);
        return next;
      },
      { replace: true },
    );
  };

  const clear = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        const task = prev.get('task');
        if (task) next.set('task', task);
        return next;
      },
      { replace: true },
    );

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.status.length ? 1 : 0) +
    (filters.priority.length ? 1 : 0) +
    (filters.assigneeId ? 1 : 0) +
    (filters.labelId ? 1 : 0) +
    (filters.overdue ? 1 : 0);

  return { filters, params, update, clear, activeCount };
}
