import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, type ProjectDetail, type TaskStatus } from '@teamflow/shared';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ProjectIcon } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { FormField, Label } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/misc';
import { errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { useState } from 'react';
import { useProject, useProjects } from '@/features/projects/api';
import { useCreateTask } from './api';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from './options';
import { AssigneeSelect, LabelPicker } from './pickers';
import { useTaskPreview } from './use-task-preview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Projekt, do kterého se úkol zakládá. Bez něj se zobrazí výběr projektu. */
  project?: ProjectDetail;
  defaultStatus?: TaskStatus;
}

export function TaskFormDialog({ open, onOpenChange, project, defaultStatus }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {open ? (
          project ? (
            <TaskForm project={project} defaultStatus={defaultStatus} onDone={() => onOpenChange(false)} />
          ) : (
            <ProjectPicker defaultStatus={defaultStatus} onDone={() => onOpenChange(false)} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectPicker({ defaultStatus, onDone }: { defaultStatus?: TaskStatus | undefined; onDone: () => void }) {
  const projects = useProjects();
  const [projectId, setProjectId] = useState<string | undefined>();
  const selectedId = projectId ?? projects.data?.[0]?.id;
  const project = useProject(selectedId);

  if (projects.data && projects.data.length === 0) {
    return (
      <div className="grid gap-4">
        <DialogHeader title="Nový úkol" description="Nejdříve je potřeba vytvořit projekt." />
        <DialogFooter>
          <Button onClick={onDone}>Rozumím</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="task-project">Projekt</Label>
        <Select
          id="task-project"
          value={selectedId ?? ''}
          onValueChange={setProjectId}
          placeholder="Načítání projektů…"
          options={(projects.data ?? []).map((p) => ({
            value: p.id,
            label: p.name,
            icon: <ProjectIcon icon={p.icon} color={p.color} size="xs" />,
          }))}
        />
      </div>
      {project.data ? (
        <TaskForm key={project.data.id} project={project.data} defaultStatus={defaultStatus} onDone={onDone} embedded />
      ) : (
        <div className="h-80 animate-shimmer rounded-lg bg-muted" />
      )}
    </div>
  );
}

const FIELDS = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'labelIds'] as const;

function TaskForm({
  project,
  defaultStatus,
  onDone,
  embedded,
}: {
  project: ProjectDetail;
  defaultStatus?: TaskStatus | undefined;
  onDone: () => void;
  embedded?: boolean;
}) {
  const create = useCreateTask(project.id);
  const preview = useTaskPreview();
  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus ?? 'TODO',
      priority: 'MEDIUM',
      assigneeId: null,
      dueDate: null,
      labelIds: [],
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const task = await create.mutateAsync({
        ...values,
        description: values.description?.trim() || undefined,
      });
      toast.success(`Úkol ${task.key} byl vytvořen.`, {
        action: { label: 'Otevřít', onClick: () => preview.open(task.key) },
      });
      onDone();
    } catch (error) {
      if (!applyServerErrors(error, form.setError, FIELDS)) toast.error(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {embedded ? null : (
        <DialogHeader
          title="Nový úkol"
          description={
            <span className="inline-flex items-center gap-1.5">
              <ProjectIcon icon={project.icon} color={project.color} size="xs" /> {project.name}
            </span>
          }
        />
      )}

      <FormField label="Název" error={errors.title?.message}>
        <Input autoFocus placeholder="Co je potřeba udělat?" {...form.register('title')} />
      </FormField>

      <FormField label="Popis" optional error={errors.description?.message}>
        <Textarea rows={4} placeholder="Kontext, akceptační kritéria, odkazy…" {...form.register('description')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="task-status">Stav</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                id="task-status"
                value={field.value ?? 'TODO'}
                onValueChange={field.onChange}
                options={STATUS_OPTIONS}
              />
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="task-priority">Priorita</Label>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select
                id="task-priority"
                value={field.value ?? 'MEDIUM'}
                onValueChange={field.onChange}
                options={PRIORITY_OPTIONS}
              />
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="task-assignee">Řešitel</Label>
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <AssigneeSelect
                id="task-assignee"
                members={project.members}
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
          {errors.assigneeId ? <p className="text-[12.5px] text-destructive">{errors.assigneeId.message}</p> : null}
        </div>
        <FormField label="Termín" optional error={errors.dueDate?.message}>
          <Input type="date" {...form.register('dueDate', { setValueAs: (v: string) => (v ? v : null) })} />
        </FormField>
      </div>

      <div className="grid gap-1.5">
        <Label>Štítky</Label>
        <Controller
          control={form.control}
          name="labelIds"
          render={({ field }) => (
            <LabelPicker labels={project.labels} value={field.value ?? []} onChange={field.onChange} />
          )}
        />
        {errors.labelIds ? <p className="text-[12.5px] text-destructive">{errors.labelIds.message}</p> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Zrušit
        </Button>
        <Button type="submit" loading={create.isPending}>
          Vytvořit úkol
        </Button>
      </DialogFooter>
    </form>
  );
}
