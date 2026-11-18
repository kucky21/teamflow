import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type Label,
  type Member,
} from '@teamflow/shared';
import { AlarmClock, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { PriorityIcon, StatusIcon, UserAvatar } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import type { TaskFilterState } from './use-task-filters';

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  // Hodnota se může změnit zvenčí (zrušení filtrů) – převezmeme ji během renderu.
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  // Debounce, aby se dotaz neodesílal při každém stisku klávesy.
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Hledat úkoly…"
        aria-label="Hledat úkoly"
        className="h-8 pl-8 text-[13px]"
      />
    </div>
  );
}

function FilterButton({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            count > 0 && 'border-primary/50 bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft',
          )}
        >
          {label}
          {count > 0 ? <span className="tabular">· {count}</span> : null}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface FilterBarProps {
  filters: TaskFilterState;
  onChange: (patch: Partial<TaskFilterState>) => void;
  onClear: () => void;
  activeCount: number;
  members?: Member[];
  labels?: Label[];
  showStatus?: boolean;
  showOverdue?: boolean;
  trailing?: ReactNode;
}

export function TaskFilterBar({
  filters,
  onChange,
  onClear,
  activeCount,
  members,
  labels,
  showStatus = true,
  showOverdue = true,
  trailing,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtry úkolů">
      <SearchInput value={filters.q} onChange={(q) => onChange({ q })} />
      <span className="hidden items-center text-subtle-foreground sm:flex">
        <SlidersHorizontal className="size-4" />
      </span>

      {showStatus ? (
        <FilterButton label="Stav" count={filters.status.length}>
          {TASK_STATUSES.map((s) => (
            <DropdownMenuCheckItem
              key={s}
              checked={filters.status.includes(s)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onChange({ status: toggle(filters.status, s) })}
            >
              <StatusIcon status={s} /> {TASK_STATUS_LABELS[s]}
            </DropdownMenuCheckItem>
          ))}
        </FilterButton>
      ) : null}

      <FilterButton label="Priorita" count={filters.priority.length}>
        {[...TASK_PRIORITIES].reverse().map((p) => (
          <DropdownMenuCheckItem
            key={p}
            checked={filters.priority.includes(p)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onChange({ priority: toggle(filters.priority, p) })}
          >
            <PriorityIcon priority={p} /> {TASK_PRIORITY_LABELS[p]}
          </DropdownMenuCheckItem>
        ))}
      </FilterButton>

      <FilterButton label="Řešitel" count={filters.assigneeId ? 1 : 0}>
        <DropdownMenuCheckItem
          checked={filters.assigneeId === 'me'}
          onCheckedChange={(c) => onChange({ assigneeId: c ? 'me' : undefined })}
        >
          Moje úkoly
        </DropdownMenuCheckItem>
        <DropdownMenuCheckItem
          checked={filters.assigneeId === 'none'}
          onCheckedChange={(c) => onChange({ assigneeId: c ? 'none' : undefined })}
        >
          Nepřiřazené
        </DropdownMenuCheckItem>
        {members?.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Členové</DropdownMenuLabel>
            {members.map((m) => (
              <DropdownMenuCheckItem
                key={m.user.id}
                checked={filters.assigneeId === m.user.id}
                onCheckedChange={(c) => onChange({ assigneeId: c ? m.user.id : undefined })}
              >
                <UserAvatar user={m.user} size="xs" className="ring-0" />{' '}
                <span className="truncate">{m.user.name}</span>
              </DropdownMenuCheckItem>
            ))}
          </>
        ) : null}
      </FilterButton>

      {labels?.length ? (
        <FilterButton label="Štítek" count={filters.labelId ? 1 : 0}>
          {labels.map((l) => (
            <DropdownMenuCheckItem
              key={l.id}
              checked={filters.labelId === l.id}
              onCheckedChange={(c) => onChange({ labelId: c ? l.id : undefined })}
            >
              <span className="size-2.5 rounded-full" style={{ background: l.color }} /> {l.name}
            </DropdownMenuCheckItem>
          ))}
        </FilterButton>
      ) : null}

      {showOverdue ? (
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={filters.overdue}
          onClick={() => onChange({ overdue: !filters.overdue })}
          className={cn(
            filters.overdue && 'border-destructive/40 bg-destructive-soft text-destructive hover:bg-destructive-soft',
          )}
        >
          <AlarmClock /> Po termínu
        </Button>
      ) : null}

      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X /> Zrušit filtry
        </Button>
      ) : null}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
