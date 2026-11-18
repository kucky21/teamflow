import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const fieldBase =
  'w-full min-w-0 rounded-md border border-input bg-surface text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldBase, 'h-9 px-3', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-24 resize-y px-3 py-2 leading-relaxed', className)} {...props} />;
}

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldBase, 'h-9 cursor-pointer appearance-none px-3 pr-8', className)} {...props} />;
}
