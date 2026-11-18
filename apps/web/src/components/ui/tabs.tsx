import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-xs [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  );
}
