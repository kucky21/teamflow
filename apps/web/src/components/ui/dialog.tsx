import { X } from 'lucide-react';
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlayClass =
  'fixed inset-0 z-50 bg-[oklch(0.15_0.02_250/0.45)] backdrop-blur-[2px] data-[state=open]:animate-fade-in';

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-pop data-[state=open]:animate-scale-in',
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" aria-label="Zavřít">
              <X />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="grid gap-1.5 pr-8">
      <DialogPrimitive.Title className="text-lg font-bold tracking-tight">{title}</DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-sm text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
      )}
    </div>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

/** Postranní panel (sheet) – používá se pro rychlý náhled úkolu. */
export function SheetContent({
  className,
  children,
  title,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-surface-raised shadow-pop outline-none data-[state=open]:animate-slide-in-right',
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Detail úkolu</DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayClass} />
        <AlertPrimitive.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-surface-raised p-6 shadow-pop data-[state=open]:animate-scale-in">
          <AlertPrimitive.Title className="text-lg font-bold tracking-tight">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </AlertPrimitive.Description>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel asChild>
              <Button variant="secondary">Zrušit</Button>
            </AlertPrimitive.Cancel>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              loading={loading}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
