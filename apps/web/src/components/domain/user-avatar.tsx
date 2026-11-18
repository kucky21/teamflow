import type { UserSummary } from '@teamflow/shared';

import { Tooltip } from '@/components/ui/tooltip';
import { cn, initials } from '@/lib/utils';

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
