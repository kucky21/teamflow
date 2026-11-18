import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full border border-border bg-muted px-2 text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
