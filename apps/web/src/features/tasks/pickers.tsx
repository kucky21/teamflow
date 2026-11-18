import type { Label, Member } from '@teamflow/shared';
import { Check, Plus, Tags, UserRound } from 'lucide-react';
import { useState } from 'react';

import { LabelChip } from '@/components/domain/label-chip';
import { UserAvatar } from '@/components/domain/user-avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const NONE = '__none__';

export function AssigneeSelect({
  members,
  value,
  onChange,
  disabled,
  id,
  size,
}: {
  members: Member[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  id?: string;
  size?: 'sm' | 'md';
}) {
  const options: SelectOption<string>[] = [
    {
      value: NONE,
      label: 'Nepřiřazeno',
      icon: (
        <span className="grid size-5 place-items-center rounded-full border border-dashed border-border-strong">
          <UserRound className="size-3 text-subtle-foreground" />
        </span>
      ),
    },
    ...members.map((m) => ({
      value: m.user.id,
      label: m.user.name,
      icon: <UserAvatar user={m.user} size="xs" className="ring-0" />,
    })),
  ];
  return (
    <Select
      {...(id ? { id } : {})}
      {...(size ? { size } : {})}
      aria-label="Řešitel"
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      options={options}
      {...(disabled ? { disabled } : {})}
    />
  );
}

export function LabelPicker({
  labels,
  value,
  onChange,
  disabled,
  emptyHint = 'Projekt zatím nemá štítky. Spravují se v nastavení projektu.',
}: {
  labels: Label[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = labels.filter((l) => value.includes(l.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label="Štítky"
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-surface px-2 py-1.5 text-left text-sm shadow-xs transition-colors hover:border-border-strong disabled:opacity-60',
          )}
        >
          {selected.length ? (
            selected.map((l) => <LabelChip key={l.id} label={l} />)
          ) : (
            <span className="flex items-center gap-1.5 px-1 text-subtle-foreground">
              <Tags className="size-4" /> Přidat štítky
            </span>
          )}
          {selected.length ? <Plus className="ml-auto size-3.5 text-subtle-foreground" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1">
        {labels.length === 0 ? (
          <p className="p-3 text-[13px] text-muted-foreground">{emptyHint}</p>
        ) : (
          <ul role="listbox" aria-multiselectable className="max-h-72 overflow-y-auto">
            {labels.map((l) => {
              const checked = value.includes(l.id);
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(l.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] hover:bg-accent"
                  >
                    <span
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong',
                      )}
                    >
                      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="truncate">{l.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
