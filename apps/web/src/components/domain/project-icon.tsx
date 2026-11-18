import type { ProjectIcon as ProjectIconName } from '@teamflow/shared';

import { cn } from '@/lib/utils';

import { PROJECT_ICON_COMPONENTS } from './tokens';

export function ProjectIcon({
  icon,
  color,
  size = 'md',
  className,
}: {
  icon: ProjectIconName;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const Icon = PROJECT_ICON_COMPONENTS[icon];
  const box = {
    xs: 'size-5 rounded-[5px]',
    sm: 'size-6 rounded-md',
    md: 'size-8 rounded-lg',
    lg: 'size-11 rounded-xl',
  }[size];
  const glyph = { xs: 'size-3', sm: 'size-3.5', md: 'size-4', lg: 'size-5.5' }[size];
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center text-white shadow-xs', box, className)}
      style={{ background: `linear-gradient(145deg, ${color}, color-mix(in oklch, ${color} 72%, black))` }}
      aria-hidden
    >
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
}
