import { TASK_SORT_FIELDS, type Task, type TaskSortField } from '@teamflow/shared';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  MessageSquare,
  Plus,
  SearchX,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { LabelChip, PriorityBadge, ProjectIcon, StatusBadge, UserAvatar } from '@/components/domain';
import { PageContainer, PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, Skeleton } from '@/components/ui/misc';
import { dueState, formatDue } from '@/lib/format';
import { cn, plural } from '@/lib/utils';
import { useProjectContext } from '@/features/projects/project-context';
import { useTasks } from './api';
import { TaskFilterBar } from './task-filters';
import { useTaskFilterParams } from './use-task-filters';
import { TaskFormDialog } from './task-form-dialog';
import { useTaskPreview } from './use-task-preview';

const PAGE_SIZE = 20;

const COLUMNS: { field: TaskSortField | null; label: string; className?: string }[] = [
  { field: 'number', label: 'ID', className: 'w-24' },
  { field: 'title', label: 'Název' },
  { field: 'status', label: 'Stav', className: 'w-36' },
  { field: 'priority', label: 'Priorita', className: 'w-32' },
  { field: null, label: 'Řešitel', className: 'w-44' },
  { field: 'dueDate', label: 'Termín', className: 'w-28' },
  { field: 'updatedAt', label: 'Změněno', className: 'hidden w-28 xl:table-cell' },
];

export function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <PageContainer>
      <PageHeader
        title="Úkoly"
        description="Úkoly ze všech aktivních projektů, ve kterých jste členem."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Nový úkol
          </Button>
        }
      />
      <div className="mt-6">
        <TaskTable showProject />
      </div>
      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}

export function ProjectTasksPage() {
  const { project } = useProjectContext();
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <TaskTable projectId={project.id} members={project.members} labels={project.labels} />
    </div>
  );
}

function TaskTable({
  projectId,
  showProject,
  members,
  labels,
}: {
  projectId?: string;
  showProject?: boolean;
  members?: Parameters<typeof TaskFilterBar>[0]['members'];
  labels?: Parameters<typeof TaskFilterBar>[0]['labels'];
}) {
  const { filters, params, update, clear, activeCount } = useTaskFilterParams();
  const preview = useTaskPreview();
  const rawSort = params.get('sort');
  const sort: TaskSortField = (TASK_SORT_FIELDS as readonly string[]).includes(rawSort ?? '')
    ? (rawSort as TaskSortField)
    : 'updatedAt';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const tasks = useTasks({
    projectId,
    q: filters.q || undefined,
    status: filters.status.length ? filters.status : undefined,
    priority: filters.priority.length ? filters.priority : undefined,
    assigneeId: filters.assigneeId,
    labelId: filters.labelId,
    overdue: filters.overdue || undefined,
    sort,
    order,
    page,
    pageSize: PAGE_SIZE,
  });

  const toggleSort = (field: TaskSortField) =>
    update({ sort: field, order: sort === field && order === 'asc' ? 'desc' : 'asc' });

  return (
    <div className="grid gap-4">
      <TaskFilterBar
        filters={filters}
        onChange={update}
        onClear={clear}
        activeCount={activeCount}
        {...(members ? { members } : {})}
        {...(labels ? { labels } : {})}
        trailing={
          tasks.data ? (
            <span className="text-[13px] text-muted-foreground tabular">
              {tasks.data.total} {plural(tasks.data.total, ['úkol', 'úkoly', 'úkolů'])}
            </span>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        {tasks.isPending ? (
          <div className="grid gap-px">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="m-3 h-7" />
            ))}
          </div>
        ) : tasks.isError ? (
          <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
        ) : tasks.data.items.length === 0 ? (
          activeCount > 0 ? (
            <EmptyState
              icon={SearchX}
              title="Žádné úkoly neodpovídají filtrům"
              description="Zkuste upravit hledaný výraz nebo zrušit některé filtry."
              action={
                <Button variant="secondary" onClick={clear}>
                  Zrušit filtry
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ListTodo}
              title="Zatím tu nejsou žádné úkoly"
              description="Vytvořte první úkol tlačítkem Nový úkol."
            />
          )
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', tasks.isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[860px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[12px] font-bold tracking-wide text-muted-foreground uppercase">
                  {COLUMNS.map((col) => (
                    <th key={col.label} scope="col" className={cn('px-4 py-2.5 font-bold', col.className)}>
                      {col.field ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.field!)}
                          className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                          aria-label={`Řadit podle: ${col.label}`}
                        >
                          {col.label}
                          {sort === col.field ? (
                            order === 'asc' ? (
                              <ArrowUp className="size-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="size-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.data.items.map((task) => (
                  <TaskRow key={task.id} task={task} showProject={showProject} onOpen={() => preview.open(task.key)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tasks.data && tasks.data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px]">
            <span className="text-muted-foreground tabular">
              Strana {tasks.data.page} z {tasks.data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 })}
                aria-label="Předchozí strana"
              >
                <ChevronLeft /> Předchozí
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= tasks.data.totalPages}
                onClick={() => update({ page: page + 1 })}
                aria-label="Další strana"
              >
                Další <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function TaskRow({ task, showProject, onOpen }: { task: Task; showProject?: boolean | undefined; onOpen: () => void }) {
  const due = dueState(task.dueDate, task.status === 'DONE');
  return (
    <tr
      className="group cursor-pointer border-b border-border last:border-0 hover:bg-accent/60"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      tabIndex={0}
      aria-label={`${task.key} ${task.title}`}
    >
      <td className="px-4 py-2.5 font-mono text-[12.5px] whitespace-nowrap text-muted-foreground">{task.key}</td>
      <td className="px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {showProject ? (
            <Link
              to={`/projects/${task.project.id}/board`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
              aria-label={task.project.name}
            >
              <ProjectIcon icon={task.project.icon} color={task.project.color} size="xs" />
            </Link>
          ) : null}
          <span className="truncate font-semibold group-hover:text-primary">{task.title}</span>
          {task.labels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} label={l} className="hidden lg:inline-flex" />
          ))}
          {task.commentCount > 0 ? (
            <span className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-subtle-foreground">
              <MessageSquare className="size-3.5" /> {task.commentCount}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-4 py-2.5">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-4 py-2.5">
        {task.assignee ? (
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar user={task.assignee} size="xs" className="ring-0" />
            <span className="truncate">{task.assignee.name}</span>
          </span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {task.dueDate ? (
          <span
            className={cn(
              'tabular',
              due === 'overdue' && 'font-semibold text-destructive',
              due === 'today' && 'font-semibold text-warning',
              task.status === 'DONE' && 'text-subtle-foreground line-through',
            )}
          >
            {formatDue(task.dueDate)}
          </span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        )}
      </td>
      <td className="hidden px-4 py-2.5 text-[12.5px] text-muted-foreground xl:table-cell">
        {new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' }).format(new Date(task.updatedAt))}
      </td>
    </tr>
  );
}
