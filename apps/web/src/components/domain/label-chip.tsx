import type { Label as LabelDto } from '@teamflow/shared';

import { cn } from '@/lib/utils';

export function LabelChip({ label, className }: { label: Pick<LabelDto, 'name' | 'color'>; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-36 items-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold whitespace-nowrap',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklch, ${label.color} 35%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${label.color} 12%, transparent)`,
        color: `color-mix(in oklch, ${label.color} 75%, var(--foreground))`,
      }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="truncate">{label.name}</span>
    </span>
  );
}
