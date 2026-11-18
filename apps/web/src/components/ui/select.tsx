import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

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
