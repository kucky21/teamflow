import { Check } from 'lucide-react';
import { DropdownMenu as Menu } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { popoverSurface } from './surface';

export const DropdownMenu = Menu.Root;

export const DropdownMenuTrigger = Menu.Trigger;

export const DropdownMenuGroup = Menu.Group;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content sideOffset={sideOffset} className={cn(popoverSurface, className)} {...props} />
    </Menu.Portal>
  );
}

const itemClass =
  'relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13.5px] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof Menu.Item> & { destructive?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        itemClass,
        destructive && 'text-destructive [&_svg]:!text-destructive data-[highlighted]:bg-destructive-soft',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem checked={checked} className={cn(itemClass, 'pr-8', className)} {...props}>
      {children}
      <Menu.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="!text-primary" />
      </Menu.ItemIndicator>
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={cn(
        'px-2 pt-1.5 pb-1 text-[11px] font-bold tracking-wider text-subtle-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
