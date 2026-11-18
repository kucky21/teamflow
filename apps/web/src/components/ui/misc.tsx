import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive, Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden className={cn('animate-shimmer rounded-md bg-muted', className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border border-border bg-surface shadow-card', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

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

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface px-1 font-mono text-[10.5px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

// ------------------------------------------------------------------ Tabs

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

// ------------------------------------------------------------------ Select

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  id?: string;
  size?: 'sm' | 'md';
}

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  size = 'md',
  ...rest
}: SelectProps<T>) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={rest.id}
        aria-label={rest['aria-label']}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-left text-sm shadow-xs transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 data-[placeholder]:text-subtle-foreground [&>span]:flex [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-2 [&>span]:truncate',
          size === 'sm' ? 'h-8 text-[13px]' : 'h-9',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface-raised p-1 shadow-pop data-[state=open]:animate-fade-in"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-[13.5px] outline-none select-none data-[highlighted]:bg-accent"
              >
                {option.icon}
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
