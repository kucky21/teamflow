import {
  PROJECT_ICONS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Activity,
  type ActivityChange,
  type TaskPriority,
  type TaskStatus,
} from '@teamflow/shared';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { UserAvatar } from '@/components/domain';
import { Tooltip } from '@/components/ui/menu';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTaskPreview } from '@/features/tasks/use-task-preview';

const FIELD_LABELS: Record<string, string> = {
  title: 'Název',
  description: 'Popis',
  status: 'Stav',
  priority: 'Priorita',
  assignee: 'Řešitel',
  dueDate: 'Termín',
  labels: 'Štítky',
  name: 'Název',
  color: 'Barva',
  icon: 'Ikona',
  role: 'Role',
};

function formatValue(field: string, value: string | null): string {
  if (value === null || value === '') {
    if (field === 'assignee') return 'nepřiřazeno';
    if (field === 'dueDate') return 'bez termínu';
    if (field === 'labels') return 'bez štítků';
    return '—';
  }
  if (field === 'status' && value in TASK_STATUS_LABELS) return TASK_STATUS_LABELS[value as TaskStatus];
  if (field === 'priority' && value in TASK_PRIORITY_LABELS) return TASK_PRIORITY_LABELS[value as TaskPriority];
  if (field === 'dueDate') return formatDate(value);
  if (field === 'icon' && (PROJECT_ICONS as readonly string[]).includes(value)) return value;
  return value;
}

function ChangeLine({ change }: { change: ActivityChange }) {
  const label = FIELD_LABELS[change.field] ?? change.field;
  if (change.field === 'description') {
    return <li className="text-muted-foreground">{label}: upraven</li>;
  }
  if (change.field === 'color') {
    return (
      <li className="flex items-center gap-1.5 text-muted-foreground">
        {label}:
        <span className="size-3 rounded-full" style={{ background: change.from ?? undefined }} />
        <ArrowRight className="size-3" />
        <span className="size-3 rounded-full" style={{ background: change.to ?? undefined }} />
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
      <span>{label}:</span>
      <span className="line-through decoration-subtle-foreground/60">{formatValue(change.field, change.from)}</span>
      <ArrowRight className="size-3 shrink-0" />
      <span className="font-semibold text-foreground">{formatValue(change.field, change.to)}</span>
    </li>
  );
}

function TaskRef({ activity, showTitle = true }: { activity: Activity; showTitle?: boolean }) {
  const preview = useTaskPreview();
  if (!activity.task) return null;
  const content = (
    <>
      <span className="font-mono text-[12px]">{activity.task.key}</span>
      {showTitle ? <span className="font-semibold text-foreground"> {activity.task.title}</span> : null}
    </>
  );
  // Smazaný úkol už nelze otevřít.
  if (!activity.task.id) return <span className="text-muted-foreground">{content}</span>;
  return (
    <button
      type="button"
      onClick={() => preview.open(activity.task!.key)}
      className="text-left text-muted-foreground hover:text-primary hover:underline"
    >
      {content}
    </button>
  );
}

function describe(a: Activity, context: 'global' | 'project' | 'task'): ReactNode {
  const task = context === 'task' ? null : <TaskRef activity={a} />;
  const member = a.meta['memberName'] ? <strong className="text-foreground">{a.meta['memberName']}</strong> : null;
  const status = a.changes.find((c) => c.field === 'status');
  const projectName =
    context === 'global' ? (
      <Link to={`/projects/${a.project.id}`} className="font-semibold text-foreground hover:underline">
        {a.project.name}
      </Link>
    ) : (
      'projektu'
    );

  switch (a.type) {
    case 'TASK_CREATED':
      return <>vytvoření úkolu {task}</>;
    case 'TASK_MOVED':
      return (
        <>
          přesun {task ?? 'úkolu'} do{' '}
          <strong className="text-foreground">{formatValue('status', status?.to ?? null)}</strong>
        </>
      );
    case 'TASK_UPDATED':
      return <>úprava {task ?? 'úkolu'}</>;
    case 'TASK_DELETED':
      return <>smazání úkolu {task}</>;
    case 'COMMENT_ADDED':
      return <>komentář {task ? <>u {task}</> : null}</>;
    case 'COMMENT_DELETED':
      return <>odstranění komentáře {task ? <>u {task}</> : null}</>;
    case 'PROJECT_CREATED':
      return <>založení {projectName}</>;
    case 'PROJECT_UPDATED':
      return <>úprava {projectName}</>;
    case 'PROJECT_ARCHIVED':
      return <>archivace {projectName}</>;
    case 'PROJECT_UNARCHIVED':
      return <>obnovení {projectName} z archivu</>;
    case 'MEMBER_ADDED':
      return (
        <>
          přidání člena {member}
          {a.meta['role'] ? <> jako {a.meta['role'].toLowerCase()}</> : null}
        </>
      );
    case 'MEMBER_REMOVED':
      return <>odebrání člena {member}</>;
    case 'MEMBER_ROLE_CHANGED':
      return <>změna role člena {member}</>;
    case 'LABEL_CREATED':
      return <>nový štítek „{a.meta['labelName']}“</>;
    case 'LABEL_UPDATED':
      return <>úprava štítku „{a.meta['labelName']}“</>;
    case 'LABEL_DELETED':
      return <>smazání štítku „{a.meta['labelName']}“</>;
  }
}

export function ActivityItem({
  activity,
  context = 'project',
}: {
  activity: Activity;
  context?: 'global' | 'project' | 'task';
}) {
  const showChanges =
    activity.changes.length > 0 && activity.type !== 'TASK_MOVED' && activity.type !== 'PROJECT_CREATED';
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span aria-hidden className="absolute top-8 bottom-0 left-[13px] w-px bg-border group-last:hidden" />
      <UserAvatar user={activity.actor} size="sm" className="relative mt-0.5 size-7 text-[10px]" />
      <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
        <p className="text-muted-foreground">
          <strong className="font-bold text-foreground">{activity.actor.name}</strong>{' '}
          <span>{describe(activity, context)}</span>
          {context === 'global' && activity.task ? null : null}
        </p>
        {context === 'global' && activity.type.startsWith('TASK') ? (
          <p className="text-[12px] text-subtle-foreground">{activity.project.name}</p>
        ) : null}
        {activity.type === 'COMMENT_ADDED' && activity.meta['excerpt'] ? (
          <p className="mt-1.5 line-clamp-2 rounded-md border-l-2 border-border-strong bg-muted/60 px-2.5 py-1.5 text-[13px] text-foreground/85">
            {activity.meta['excerpt']}
          </p>
        ) : null}
        {showChanges ? (
          <ul className="mt-1 grid gap-0.5 text-[12.5px]">
            {activity.changes.map((c, i) => (
              <ChangeLine key={`${c.field}-${i}`} change={c} />
            ))}
          </ul>
        ) : null}
        <Tooltip content={formatDateTime(activity.createdAt)}>
          <time dateTime={activity.createdAt} className="mt-0.5 block w-fit text-[12px] text-subtle-foreground">
            {formatRelative(activity.createdAt)}
          </time>
        </Tooltip>
      </div>
    </li>
  );
}

export function ActivityList({
  items,
  context,
  className,
}: {
  items: Activity[];
  context?: 'global' | 'project' | 'task';
  className?: string;
}) {
  return (
    <ul className={cn('grid', className)}>
      {items.map((a) => (
        <ActivityItem key={a.id} activity={a} {...(context ? { context } : {})} />
      ))}
    </ul>
  );
}
