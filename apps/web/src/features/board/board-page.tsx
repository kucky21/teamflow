import {
  type Announcements,
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { hasProjectPermission, type Task, TASK_STATUS_LABELS, TASK_STATUSES, type TaskStatus } from '@teamflow/shared';
import { KanbanSquare, SearchX } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectContext } from '@/features/projects/project-context';
import { type BoardFilters, useBoard, useMoveTask } from '@/features/tasks/api';
import { TaskFilterBar } from '@/features/tasks/task-filters';
import { useTaskFilterParams } from '@/features/tasks/use-task-filters';
import { useTaskPreview } from '@/features/tasks/use-task-preview';
import { errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

import { BoardColumn } from './board-column';
import { groupByStatus, resolveDrop } from './board-logic';
import { TaskCardView } from './task-card';

type Columns = Record<TaskStatus, string[]>;
const STATUS_SET = new Set<UniqueIdentifier>(TASK_STATUSES);

function findContainer(columns: Columns, id: UniqueIdentifier): TaskStatus | undefined {
  if (STATUS_SET.has(id)) return id as TaskStatus;
  return TASK_STATUSES.find((s) => columns[s].includes(String(id)));
}

/** Preferuje kartu pod kurzorem, jinak sloupec – stabilní chování mezi sloupci. */
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const hits = pointer.length ? pointer : rectIntersection(args);
  const cardIds = new Set(hits.filter((h) => !STATUS_SET.has(h.id)).map((h) => h.id));
  if (cardIds.size) {
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => cardIds.has(c.id)) });
  }
  return hits;
};

export function BoardPage() {
  const { project, readOnly, openCreateTask } = useProjectContext();
  const preview = useTaskPreview();
  const { filters, update, clear, activeCount } = useTaskFilterParams();

  const boardFilters = useMemo<BoardFilters>(
    () => ({
      q: filters.q || undefined,
      assigneeId: filters.assigneeId,
      priority: filters.priority.length ? filters.priority : undefined,
      labelId: filters.labelId,
    }),
    [filters.q, filters.assigneeId, filters.priority, filters.labelId],
  );
  const boardKey = useMemo(() => queryKeys.board(project.id, boardFilters), [project.id, boardFilters]);
  const board = useBoard(project.id, boardFilters);
  const move = useMoveTask(project.id, boardKey);

  const canDrag = !readOnly && hasProjectPermission(project.myRole, 'task:update');
  const canCreate = !readOnly && hasProjectPermission(project.myRole, 'task:create');

  const tasks = board.data?.tasks;
  const tasksById = useMemo(() => new Map((tasks ?? []).map((t) => [t.id, t])), [tasks]);
  const serverColumns = useMemo<Columns>(() => {
    const groups = groupByStatus(tasks ?? []);
    return Object.fromEntries(TASK_STATUSES.map((s) => [s, groups[s].map((t) => t.id)])) as Columns;
  }, [tasks]);

  // Během tažení (a do příchodu optimistické aktualizace) se zobrazuje lokální uspořádání.
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const originalRef = useRef<Columns | null>(null);
  const columns = dragColumns ?? serverColumns;

  // Jakmile se změní data (optimistický zápis do cache nebo odpověď serveru),
  // převezme zobrazení opět cache. Úprava stavu během renderu – bez efektu.
  const [seenTasks, setSeenTasks] = useState(tasks);
  if (seenTasks !== tasks) {
    setSeenTasks(tasks);
    if (!activeId) setDragColumns(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    originalRef.current = serverColumns;
    setDragColumns(serverColumns);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragColumns((prev) => {
      if (!prev) return prev;
      const from = findContainer(prev, active.id);
      const to = findContainer(prev, over.id);
      if (!from || !to || from === to) return prev;
      const activeKey = String(active.id);
      const target = [...prev[to]];
      let index = target.length;
      if (!STATUS_SET.has(over.id)) {
        const overIndex = target.indexOf(String(over.id));
        const translated = active.rect.current.translated;
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0);
      }
      target.splice(index, 0, activeKey);
      return { ...prev, [from]: prev[from].filter((id) => id !== activeKey), [to]: target };
    });
  };

  const finishDrag = useCallback(() => {
    setActiveId(null);
    originalRef.current = null;
  }, []);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragColumns;
    const original = originalRef.current;
    finishDrag();
    if (!over || !current || !original) {
      setDragColumns(null);
      return;
    }
    let final = current;
    const container = findContainer(current, active.id);
    const overContainer = findContainer(current, over.id);
    if (container && container === overContainer && !STATUS_SET.has(over.id)) {
      const items = current[container];
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        final = { ...current, [container]: arrayMove(items, oldIndex, newIndex) };
      }
    }
    const input = resolveDrop(original, final, String(active.id));
    if (!input) {
      setDragColumns(null);
      return;
    }
    setDragColumns(final);
    move.mutate(input, {
      onError: (error) => {
        setDragColumns(null);
        toast.error('Přesun se nepodařilo uložit', { description: errorMessage(error) });
      },
    });
  };

  const onDragCancel = () => {
    finishDrag();
    setDragColumns(null);
  };

  const label = (id: UniqueIdentifier) => {
    const t = tasksById.get(String(id));
    return t ? `${t.key} ${t.title}` : 'Úkol';
  };
  const columnLabel = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return '';
    const status = findContainer(columns, id);
    return status ? TASK_STATUS_LABELS[status] : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Zvedli jste úkol ${label(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Úkol ${label(active.id)} je nad sloupcem ${columnLabel(over.id)}.`
        : `Úkol ${label(active.id)} není nad žádným sloupcem.`,
    onDragEnd: ({ active, over }) =>
      over ? `Úkol ${label(active.id)} byl přesunut do sloupce ${columnLabel(over.id)}.` : 'Přesun byl zrušen.',
    onDragCancel: ({ active }) => `Přesun úkolu ${label(active.id)} byl zrušen.`,
  };

  const activeTask: Task | undefined = activeId ? tasksById.get(activeId) : undefined;
  const overColumn = activeId ? findContainer(columns, activeId) : undefined;

  return (
    <div className="flex min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <TaskFilterBar
        filters={filters}
        onChange={update}
        onClear={clear}
        activeCount={activeCount}
        members={project.members}
        labels={project.labels}
        showStatus={false}
        showOverdue={false}
        trailing={
          board.data?.truncated ? (
            <span className="text-[12.5px] text-warning">Zobrazeno prvních 500 úkolů – upřesněte filtr.</span>
          ) : null
        }
      />

      {board.isPending ? (
        <div className="flex gap-4 overflow-hidden">
          {TASK_STATUSES.map((s) => (
            <div key={s} className="w-[300px] shrink-0">
              <Skeleton className="mb-3 h-5 w-28" />
              <div className="grid gap-2 rounded-xl bg-muted/45 p-1.5">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg bg-surface" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : board.isError ? (
        <ErrorState error={board.error} onRetry={() => void board.refetch()} />
      ) : board.data.tasks.length === 0 && activeCount > 0 ? (
        <EmptyState
          icon={SearchX}
          title="Žádné úkoly neodpovídají filtrům"
          action={
            <Button variant="secondary" onClick={clear}>
              Zrušit filtry
            </Button>
          }
        />
      ) : board.data.tasks.length === 0 && !canCreate ? (
        <EmptyState icon={KanbanSquare} title="Projekt zatím nemá žádné úkoly" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                'Úkol zvednete mezerníkem. Šipkami jej přesouvejte mezi sloupci a v rámci sloupce, mezerníkem jej položíte, klávesou Escape přesun zrušíte. Enter otevře detail.',
            },
          }}
        >
          <div
            className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            data-testid="board"
          >
            {TASK_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                taskIds={columns[status]}
                tasksById={tasksById}
                canDrag={canDrag}
                onCreate={canCreate ? () => openCreateTask(status) : undefined}
                onOpenTask={preview.open}
                isDropTarget={Boolean(activeId) && overColumn === status}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
