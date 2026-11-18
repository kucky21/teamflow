import { cn } from '@/lib/utils';

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="tf-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#tf-logo)" />
        <rect x="7" y="8" width="14" height="4" rx="2" fill="#CCFBF1" />
        <rect x="11" y="14" width="14" height="4" rx="2" fill="#5EEAD4" />
        <rect x="7" y="20" width="10" height="4" rx="2" fill="#F0FDFA" />
      </svg>
      {withText ? <span className="text-[17px] font-extrabold tracking-tight">TeamFlow</span> : null}
    </span>
  );
}
