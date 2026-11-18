import { TASK_STATUS_LABELS, type TaskStatus } from '@teamflow/shared';

import { cn } from '@/lib/utils';

import { STATUS_COLOR_CLASS } from './tokens';

/** Ikona stavu – kruh, jehož výplň odpovídá postupu ve workflow. */
export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const progress = { BACKLOG: 0, TODO: 0, IN_PROGRESS: 0.5, REVIEW: 0.75, DONE: 1 }[status];
  const r = 4.5;
  const circumference = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('size-4 shrink-0', STATUS_COLOR_CLASS[status], className)}
      aria-label={TASK_STATUS_LABELS[status]}
      role="img"
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray={status === 'BACKLOG' ? '2.2 2' : undefined}
      />
      {status === 'DONE' ? (
        <>
          <circle cx="8" cy="8" r="6.5" fill="currentColor" />
          <path
            d="M5.2 8.2l1.9 1.9 3.8-4"
            fill="none"
            stroke="var(--surface)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : progress > 0 ? (
        <circle
          cx="8"
          cy="8"
          r={r / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={r}
          strokeDasharray={`${(circumference / 2) * progress} ${circumference}`}
          transform="rotate(-90 8 8)"
        />
      ) : null}
    </svg>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap', className)}>
      <StatusIcon status={status} />
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
