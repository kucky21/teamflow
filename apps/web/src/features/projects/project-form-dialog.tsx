import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProjectSchema,
  PALETTE_COLORS,
  PROJECT_ICONS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type ProjectDetail,
  suggestProjectKey,
} from '@teamflow/shared';
import { Check } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ProjectIcon } from '@/components/domain/project-icon';
import { PROJECT_ICON_COMPONENTS } from '@/components/domain/tokens';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { FormField, Label } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { cn } from '@/lib/utils';

import { useCreateProject, useUpdateProject } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Při předání projektu se dialog chová jako úprava. */
  project?: ProjectDetail;
}

const FIELDS = ['name', 'key', 'description', 'color', 'icon', 'status'] as const;

export function ProjectFormDialog({ open, onOpenChange, project }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open ? <ProjectForm project={project} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ project, onDone }: { project?: ProjectDetail | undefined; onDone: () => void }) {
  const isEdit = Boolean(project);
  const navigate = useNavigate();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');

  const form = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? '',
      color: (project?.color as (typeof PALETTE_COLORS)[number] | undefined) ?? PALETTE_COLORS[0],
      icon: project?.icon ?? 'rocket',
      status: project?.status ?? 'ACTIVE',
    },
  });
  const { errors } = form.formState;
  const [name, color, icon, key] = useWatch({ control: form.control, name: ['name', 'color', 'icon', 'key'] });

  // Klíč se navrhuje z názvu, dokud ho uživatel sám neupraví (pole klíče není „dirty“).
  const suggestKey = (value: string) => {
    if (isEdit || form.getFieldState('key').isDirty) return;
    form.setValue('key', value.trim().length >= 2 ? suggestProjectKey(value) : '', {
      shouldValidate: form.formState.isSubmitted,
    });
  };

  const pending = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (project) {
        await update.mutateAsync({
          name: values.name,
          description: values.description?.trim() ? values.description : null,
          color: values.color,
          icon: values.icon,
          status: values.status,
        });
        toast.success('Projekt byl upraven.');
        onDone();
      } else {
        const created = await create.mutateAsync(values);
        toast.success(`Projekt „${created.name}“ byl vytvořen.`);
        onDone();
        void navigate(`/projects/${created.id}/board`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PROJECT_KEY_TAKEN') {
        form.setError('key', { message: error.message });
        return;
      }
      if (!applyServerErrors(error, form.setError, FIELDS)) toast.error(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader
        title={isEdit ? 'Upravit projekt' : 'Nový projekt'}
        description={isEdit ? 'Změny uvidí všichni členové projektu.' : 'Projekt sdružuje úkoly, členy týmu a štítky.'}
      />

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <ProjectIcon icon={icon} color={color} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-bold">{name || 'Název projektu'}</p>
          <p className="font-mono text-[12px] text-muted-foreground">{key || 'KLÍČ'}-1, -2, -3…</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <FormField label="Název" error={errors.name?.message}>
          <Input
            autoFocus
            placeholder="Např. Mobilní aplikace"
            {...form.register('name', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => suggestKey(e.target.value),
            })}
          />
        </FormField>
        <FormField label="Klíč" error={errors.key?.message} hint={isEdit ? 'Klíč nelze změnit.' : 'Prefix ID úkolů'}>
          <Input className="font-mono uppercase" maxLength={6} disabled={isEdit} {...form.register('key')} />
        </FormField>
      </div>

      <FormField label="Popis" optional error={errors.description?.message}>
        <Textarea rows={3} placeholder="Stručně, čeho chce projekt dosáhnout." {...form.register('description')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Barva</Label>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Barva projektu" className="flex flex-wrap gap-1.5">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={field.value === c}
                    aria-label={c}
                    onClick={() => field.onChange(c)}
                    className={cn(
                      'grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface-raised transition-transform hover:scale-110',
                      field.value === c && 'ring-2 ring-foreground/70',
                    )}
                    style={{ background: c }}
                  >
                    {field.value === c ? <Check className="size-3.5 text-white" strokeWidth={3} /> : null}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="project-status">Stav</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                id="project-status"
                value={field.value}
                onValueChange={field.onChange}
                options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
              />
            )}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Ikona</Label>
        <Controller
          control={form.control}
          name="icon"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Ikona projektu" className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {PROJECT_ICONS.map((i) => {
                const Icon = PROJECT_ICON_COMPONENTS[i];
                const selected = field.value === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={i}
                    onClick={() => field.onChange(i)}
                    className={cn(
                      'grid aspect-square place-items-center rounded-md border transition-colors',
                      selected
                        ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Zrušit
        </Button>
        <Button type="submit" loading={pending}>
          {isEdit ? 'Uložit změny' : 'Vytvořit projekt'}
        </Button>
      </DialogFooter>
    </form>
  );
}
