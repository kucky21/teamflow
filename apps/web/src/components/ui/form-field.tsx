import { Label as LabelPrimitive } from 'radix-ui';
import { cloneElement, type ComponentProps, isValidElement, type ReactElement, type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils';

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-[13px] font-semibold text-foreground select-none', className)}
      {...props}
    />
  );
}

interface FormFieldProps {
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
  className?: string;
  /** Jediný ovládací prvek – dostane id, aria-invalid a aria-describedby. */
  children: ReactElement<Record<string, unknown>>;
  optional?: boolean;
}

export function FormField({ label, error, hint, className, children, optional }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })
    : children;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="ml-1 font-normal text-subtle-foreground">(volitelné)</span> : null}
      </Label>
      {control}
      {error ? (
        <p id={messageId} role="alert" className="text-[12.5px] font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[12.5px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
