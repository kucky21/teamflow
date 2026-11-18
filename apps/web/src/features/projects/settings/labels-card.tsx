import { createLabelSchema, hasProjectPermission, type Label, PALETTE_COLORS } from '@teamflow/shared';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LabelChip } from '@/components/domain/label-chip';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useLabelMutations } from '@/features/projects/api';
import { useProjectContext } from '@/features/projects/project-context';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export function LabelsCard() {
  const { project } = useProjectContext();
  const { create, update, remove } = useLabelMutations(project.id);
  const canManage = !project.archivedAt && hasProjectPermission(project.myRole, 'label:manage');
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PALETTE_COLORS[1]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Label | null>(null);

  const submit = () => {
    const parsed = createLabelSchema.safeParse({ name, color });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Neplatný štítek');
      return;
    }
    setError(null);
    create.mutate(parsed.data, {
      onSuccess: () => {
        setName('');
        toast.success(`Štítek „${parsed.data.name}“ byl vytvořen.`);
      },
      onError: (e) => setError(errorMessage(e)),
    });
  };

  return (
    <Card>
      <CardHeader title="Štítky" description="Štítky pomáhají třídit úkoly a filtrovat Kanban." />
      <div className="grid gap-4 p-5">
        {project.labels.length ? (
          <ul className="flex flex-wrap gap-2">
            {project.labels.map((l) =>
              editing === l.id ? (
                <LabelEditor
                  key={l.id}
                  label={l}
                  saving={update.isPending}
                  onCancel={() => setEditing(null)}
                  onSave={(input) =>
                    update.mutate(
                      { id: l.id, ...input },
                      {
                        onSuccess: () => setEditing(null),
                        onError: (e) => toast.error(errorMessage(e)),
                      },
                    )
                  }
                />
              ) : (
                <li key={l.id} className="group flex items-center gap-0.5 rounded-full">
                  <LabelChip label={l} className="h-7 px-2.5 text-[12.5px]" />
                  {canManage ? (
                    <span className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Upravit štítek ${l.name}`}
                        onClick={() => setEditing(l.id)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Smazat štítek ${l.name}`}
                        onClick={() => setDeleting(l)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </span>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="text-[13.5px] text-muted-foreground">Projekt zatím nemá žádné štítky.</p>
        )}

        {canManage ? (
          <form
            className="flex flex-wrap items-start gap-2 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid min-w-48 flex-1 gap-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Název nového štítku"
                aria-label="Název nového štítku"
                maxLength={32}
                aria-invalid={error ? true : undefined}
                className="h-8"
              />
              {error ? <p className="text-[12.5px] font-medium text-destructive">{error}</p> : null}
            </div>
            <ColorSwatches value={color} onChange={setColor} />
            <Button type="submit" size="sm" loading={create.isPending}>
              <Plus /> Přidat štítek
            </Button>
          </form>
        ) : null}
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Smazat štítek „${deleting?.name ?? ''}“?`}
        description="Štítek bude odebrán ze všech úkolů v projektu."
        confirmLabel="Smazat štítek"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </Card>
  );
}

function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Barva štítku" className="flex h-8 items-center gap-1">
      {PALETTE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            'size-5 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110',
            value === c && 'ring-2 ring-foreground/60',
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function LabelEditor({
  label,
  saving,
  onSave,
  onCancel,
}: {
  label: Label;
  saving: boolean;
  onSave: (input: { name: string; color: (typeof PALETTE_COLORS)[number] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  return (
    <li className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border p-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-48"
        aria-label="Název štítku"
        maxLength={32}
        autoFocus
      />
      <ColorSwatches value={color} onChange={setColor} />
      <div className="ml-auto flex gap-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Zrušit
        </Button>
        <Button
          size="sm"
          loading={saving}
          disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), color: color as (typeof PALETTE_COLORS)[number] })}
        >
          Uložit
        </Button>
      </div>
    </li>
  );
}
