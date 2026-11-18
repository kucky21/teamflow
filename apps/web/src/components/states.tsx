import { AlertTriangle, type LucideIcon, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16',
        className,
      )}
    >
      <div
        className={cn(
          'relative grid place-items-center rounded-2xl border border-border bg-gradient-to-b from-surface to-muted text-muted-foreground shadow-xs',
          compact ? 'size-10' : 'size-14',
        )}
      >
        <Icon className={compact ? 'size-5' : 'size-6'} strokeWidth={1.75} />
      </div>
      <div className="max-w-sm">
        <p className={cn('font-bold tracking-tight', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {description ? <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Data se nepodařilo načíst',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <AlertTriangle className="size-6" strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw /> Zkusit znovu
        </Button>
      ) : null}
    </div>
  );
}
