import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Label as LabelDto,
  type ProjectIcon as ProjectIconName,
  type TaskPriority,
  type TaskStatus,
  type UserSummary,
} from '@teamflow/shared';
import { Box } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { PROJECT_ICON_COMPONENTS, STATUS_COLOR_CLASS } from './domain-tokens';
import { Tooltip } from './ui/menu';

/* ---------------------------------------------------------------- stav */

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

/* ---------------------------------------------------------------- priorita */

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

/* ---------------------------------------------------------------- projekt */

export function ProjectIcon({
  icon,
  color,
  size = 'md',
  className,
}: {
  icon: ProjectIconName;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const Icon = PROJECT_ICON_COMPONENTS[icon] ?? Box;
  const box = {
    xs: 'size-5 rounded-[5px]',
    sm: 'size-6 rounded-md',
    md: 'size-8 rounded-lg',
    lg: 'size-11 rounded-xl',
  }[size];
  const glyph = { xs: 'size-3', sm: 'size-3.5', md: 'size-4', lg: 'size-5.5' }[size];
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center text-white shadow-xs', box, className)}
      style={{ background: `linear-gradient(145deg, ${color}, color-mix(in oklch, ${color} 72%, black))` }}
      aria-hidden
    >
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
}

/* ---------------------------------------------------------------- uživatel */

export function UserAvatar({
  user,
  size = 'md',
  className,
  withTooltip,
}: {
  user: Pick<UserSummary, 'name' | 'avatarColor'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  withTooltip?: boolean;
}) {
  const dims = {
    xs: 'size-5 text-[9px]',
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-xs',
    lg: 'size-12 text-base',
  }[size];
  const avatar = (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-bold tracking-tight text-white ring-2 ring-surface select-none',
        dims,
        className,
      )}
      style={{
        background: `linear-gradient(140deg, ${user.avatarColor}, color-mix(in oklch, ${user.avatarColor} 70%, black))`,
      }}
      aria-label={user.name}
      role="img"
    >
      {initials(user.name)}
    </span>
  );
  return withTooltip ? <Tooltip content={user.name}>{avatar}</Tooltip> : avatar;
}

export function AvatarStack({ users, max = 4 }: { users: UserSummary[]; max?: number }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((u) => (
        <UserAvatar key={u.id} user={u} size="sm" withTooltip />
      ))}
      {rest > 0 ? (
        <span className="inline-grid size-6 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-surface">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- štítek */

export function LabelChip({ label, className }: { label: Pick<LabelDto, 'name' | 'color'>; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-36 items-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold whitespace-nowrap',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklch, ${label.color} 35%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${label.color} 12%, transparent)`,
        color: `color-mix(in oklch, ${label.color} 75%, var(--foreground))`,
      }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="truncate">{label.name}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- logo */

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="tf-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#tf-logo)" />
        <rect x="7" y="8" width="14" height="4" rx="2" fill="#CCFBF1" />
        <rect x="11" y="14" width="14" height="4" rx="2" fill="#5EEAD4" />
        <rect x="7" y="20" width="10" height="4" rx="2" fill="#F0FDFA" />
      </svg>
      {withText ? <span className="text-[17px] font-extrabold tracking-tight">TeamFlow</span> : null}
    </span>
  );
}
