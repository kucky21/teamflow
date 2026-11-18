import { TASK_PRIORITY_LABELS, type TaskPriority } from '@teamflow/shared';

import { cn } from '@/lib/utils';

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  LOW: 'text-priority-low',
  MEDIUM: 'text-priority-medium',
  HIGH: 'text-priority-high',
  URGENT: 'text-priority-urgent',
};

/** Ikona priority – sloupcový „signál“, urgentní má výrazný vykřičník. */
export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  const level = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }[priority];
  if (priority === 'URGENT') {
    return (
      <svg
        viewBox="0 0 16 16"
        className={cn('size-4 shrink-0', PRIORITY_CLASS[priority], className)}
        role="img"
        aria-label={`Priorita: ${TASK_PRIORITY_LABELS[priority]}`}
      >
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <rect x="7.1" y="4" width="1.8" height="5.4" rx="0.9" fill="var(--surface)" />
        <circle cx="8" cy="11.4" r="1" fill="var(--surface)" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('size-4 shrink-0', PRIORITY_CLASS[priority], className)}
      role="img"
      aria-label={`Priorita: ${TASK_PRIORITY_LABELS[priority]}`}
    >
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3.5}
          width="3"
          height={4 + i * 3.5}
          rx="1"
          fill="currentColor"
          opacity={i < level ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
      <PriorityIcon priority={priority} />
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}
