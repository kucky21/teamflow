import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TASK_PRIORITY_LABELS, type Task } from '@teamflow/shared';
import { CalendarDays, MessageSquare } from 'lucide-react';
import { memo } from 'react';
import { LabelChip, PriorityIcon, UserAvatar } from '@/components/domain';
import { Tooltip } from '@/components/ui/menu';
import { dueState, formatDue } from '@/lib/format';
import { cn } from '@/lib/utils';

const PRIORITY_ACCENT: Record<Task['priority'], string> = {
  URGENT: 'before:bg-priority-urgent',
  HIGH: 'before:bg-priority-high',
  MEDIUM: 'before:bg-transparent',
  LOW: 'before:bg-transparent',
};

interface CardProps {
  task: Task;
  overlay?: boolean;
  dragging?: boolean;
}

export const TaskCardView = memo(function TaskCardView({ task, overlay, dragging }: CardProps) {
  const due = dueState(task.dueDate, task.status === 'DONE');
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-surface p-3 text-left shadow-card transition-[border-color,box-shadow,opacity]',
        'before:absolute before:inset-y-0 before:left-0 before:w-[3px]',
        PRIORITY_ACCENT[task.priority],
        !overlay && 'hover:border-border-strong',
        dragging && 'opacity-40',
        overlay && 'rotate-[1.5deg] cursor-grabbing border-primary/40 shadow-drag',
      )}
      data-testid="task-card"
      data-task-key={task.key}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] font-medium text-muted-foreground">{task.key}</span>
        <Tooltip content={`Priorita: ${TASK_PRIORITY_LABELS[task.priority]}`}>
          <span>
            <PriorityIcon priority={task.priority} />
          </span>
        </Tooltip>
      </div>
      <p
        className={cn(
          'mt-1 text-[13.5px] leading-snug font-semibold text-foreground',
          task.status === 'DONE' && 'text-muted-foreground',
        )}
      >
        <span className="line-clamp-3">{task.title}</span>
      </p>

      {task.labels.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {task.labels.length > 3 ? (
            <span className="text-[11px] font-semibold text-subtle-foreground">+{task.labels.length - 3}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-3 text-[12px] text-muted-foreground">
        {task.dueDate ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1',
              due === 'overdue' && 'bg-destructive-soft font-semibold text-destructive',
              due === 'today' && 'font-semibold text-warning',
            )}
            title={due === 'overdue' ? 'Po termínu' : 'Termín'}
          >
            <CalendarDays className="size-3.5" />
            {formatDue(task.dueDate)}
          </span>
        ) : null}
        {task.commentCount > 0 ? (
          <span className="inline-flex items-center gap-1" aria-label={`${task.commentCount} komentářů`}>
            <MessageSquare className="size-3.5" />
            {task.commentCount}
          </span>
        ) : null}
        <span className="ml-auto">
          {task.assignee ? (
            <UserAvatar user={task.assignee} size="sm" withTooltip />
          ) : (
            <span
              className="inline-block size-6 rounded-full border border-dashed border-border-strong"
              aria-label="Nepřiřazeno"
              role="img"
            />
          )}
        </span>
      </div>
    </div>
  );
});

export function SortableTaskCard({ task, disabled, onOpen }: { task: Task; disabled: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
    disabled,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'touch-manipulation list-none rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        !disabled && 'cursor-grab',
      )}
      {...attributes}
      {...listeners}
      aria-roledescription="přesouvatelná karta úkolu"
      aria-label={`${task.key}: ${task.title}`}
      // Klik otevře rychlý náhled; tažení se aktivuje až po posunu o 6 px.
      onClick={onOpen}
      onKeyDown={(e) => {
        // Enter otevře náhled; mezerník zahajuje přesun klávesnicí (dnd-kit).
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen();
          return;
        }
        listeners?.['onKeyDown']?.(e);
      }}
    >
      <TaskCardView task={task} dragging={isDragging} />
    </li>
  );
}
