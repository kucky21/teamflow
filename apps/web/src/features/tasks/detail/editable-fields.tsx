import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function EditableTitle({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (!next) {
      setDraft(value);
      toast.error('Název úkolu nesmí být prázdný.');
      return;
    }
    if (next !== value) onSave(next);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label="Název úkolu"
        value={draft}
        maxLength={200}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-auto py-1 text-[22px] font-extrabold tracking-tight"
      />
    );
  }
  return (
    <h2
      className={cn(
        'rounded-md text-[22px] leading-snug font-extrabold tracking-tight break-words',
        editable && '-mx-1.5 cursor-text px-1.5 hover:bg-accent',
      )}
      {...(editable
        ? {
            role: 'button',
            tabIndex: 0,
            title: 'Klikněte pro úpravu',
            onClick: startEditing,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter') startEditing();
            },
          }
        : {})}
    >
      {value}
    </h2>
  );
}

export function EditableDescription({
  value,
  editable,
  saving,
  onSave,
}: {
  value: string | null;
  editable: boolean;
  saving: boolean;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold tracking-wide text-muted-foreground uppercase">Popis</h3>
        {editable && !editing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(value ?? '');
              setEditing(true);
            }}
          >
            <Pencil /> Upravit
          </Button>
        ) : null}
      </div>
      {editing ? (
        <div className="grid gap-2">
          <Textarea
            autoFocus
            rows={6}
            value={draft}
            maxLength={10_000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Popište úkol, akceptační kritéria, odkazy…"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(value ?? '');
                setEditing(false);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(value ?? '');
                setEditing(false);
              }}
            >
              Zrušit
            </Button>
            <Button
              size="sm"
              loading={saving}
              onClick={() => {
                onSave(draft.trim() ? draft.trim() : null);
                setEditing(false);
              }}
            >
              Uložit popis
            </Button>
          </div>
        </div>
      ) : value ? (
        <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap text-foreground/90">{value}</p>
      ) : (
        <p className="text-[14px] text-subtle-foreground italic">Bez popisu.</p>
      )}
    </section>
  );
}
