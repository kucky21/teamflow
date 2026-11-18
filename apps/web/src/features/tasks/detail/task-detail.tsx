import {
  canDeleteTask,
  hasProjectPermission,
  type TaskDetail as TaskDetailDto,
  type UpdateTaskInput,
} from '@teamflow/shared';
import {
  Calendar,
  CircleDot,
  Clock,
  ExternalLink,
  History,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Signal,
  Tags,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ProjectIcon } from '@/components/domain/project-icon';
import { UserAvatar } from '@/components/domain/user-avatar';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/features/auth/api';
import { useProject } from '@/features/projects/api';
import { useDeleteTask, useTask, useUpdateTask } from '@/features/tasks/api';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/features/tasks/options';
import { AssigneeSelect, LabelPicker } from '@/features/tasks/pickers';
import { errorMessage } from '@/lib/api';
import { dueState, formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

import { EditableDescription, EditableTitle } from './editable-fields';
import { TaskComments } from './task-comments';
import { TaskHistory } from './task-history';

interface TaskDetailProps {
  taskRef: string;
  variant: 'sheet' | 'page';
  onClose?: () => void;
}

export function TaskDetail({ taskRef, variant, onClose }: TaskDetailProps) {
  const task = useTask(taskRef);

  if (task.isPending) return <TaskDetailSkeleton />;
  if (task.isError) {
    return (
      <div className="p-6">
        <ErrorState error={task.error} title="Úkol se nepodařilo načíst" onRetry={() => void task.refetch()} />
      </div>
    );
  }
  return <TaskDetailView task={task.data} taskRef={taskRef} variant={variant} onClose={onClose} />;
}

function TaskDetailSkeleton() {
  return (
    <div className="grid gap-4 p-6" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    </div>
  );
}

function TaskDetailView({
  task,
  taskRef,
  variant,
  onClose,
}: {
  task: TaskDetailDto;
  taskRef: string;
  variant: 'sheet' | 'page';
  onClose?: (() => void) | undefined;
}) {
  const me = useCurrentUser();
  const project = useProject(task.project.id);
  const update = useUpdateTask(taskRef);
  const remove = useDeleteTask(task.project.id);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editable = !task.projectArchived && hasProjectPermission(task.myRole, 'task:update');
  const deletable = !task.projectArchived && canDeleteTask(task.myRole, task.creator.id === me.id);
  const members = project.data?.members ?? [];
  const labels = project.data?.labels ?? [];

  const save = (input: UpdateTaskInput, message?: string) =>
    update.mutate(input, {
      onSuccess: () => {
        if (message) toast.success(message);
      },
      onError: (error) => toast.error(errorMessage(error)),
    });

  const copyLink = async () => {
    const url = `${window.location.origin}/tasks/${task.key}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Odkaz byl zkopírován.');
    } catch {
      toast.error('Odkaz se nepodařilo zkopírovat.');
    }
  };

  const due = dueState(task.dueDate, task.status === 'DONE');

  const properties = (
    <dl className="grid gap-y-3">
      <Property icon={<CircleDot />} label="Stav">
        <Select
          size="sm"
          aria-label="Stav"
          value={task.status}
          onValueChange={(status) => save({ status })}
          options={STATUS_OPTIONS}
          disabled={!editable}
        />
      </Property>
      <Property icon={<Signal />} label="Priorita">
        <Select
          size="sm"
          aria-label="Priorita"
          value={task.priority}
          onValueChange={(priority) => save({ priority })}
          options={PRIORITY_OPTIONS}
          disabled={!editable}
        />
      </Property>
      <Property icon={<UserRound />} label="Řešitel">
        <AssigneeSelect
          size="sm"
          members={members}
          value={task.assignee?.id ?? null}
          onChange={(assigneeId) => save({ assigneeId })}
          disabled={!editable || project.isPending}
        />
      </Property>
      <Property icon={<Calendar />} label="Termín">
        <div className="relative">
          <Input
            type="date"
            aria-label="Termín"
            className={cn(
              'h-8 text-[13px]',
              due === 'overdue' && 'border-destructive/50 text-destructive',
              due === 'today' && 'border-warning/60',
            )}
            defaultValue={task.dueDate ?? ''}
            key={task.dueDate ?? 'none'}
            disabled={!editable}
            onBlur={(e) => {
              const value = e.target.value || null;
              if (value !== task.dueDate) save({ dueDate: value });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        {due === 'overdue' ? <p className="mt-1 text-[12px] font-semibold text-destructive">Po termínu</p> : null}
      </Property>
      <Property icon={<Tags />} label="Štítky">
        <LabelPicker
          labels={labels}
          value={task.labels.map((l) => l.id)}
          onChange={(labelIds) => save({ labelIds })}
          disabled={!editable || project.isPending}
        />
      </Property>
      <div className="mt-1 grid gap-1.5 border-t border-border pt-4 text-[12.5px] text-muted-foreground">
        <p className="flex items-center gap-2">
          <UserAvatar user={task.creator} size="xs" className="ring-0" />
          Autor: {task.creator.name}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="size-3.5" /> Vytvořeno {formatDateTime(task.createdAt)}
        </p>
        <p className="flex items-center gap-2">
          <Pencil className="size-3.5" /> Upraveno {formatRelative(task.updatedAt)}
        </p>
        {task.completedAt ? (
          <p className="flex items-center gap-2 font-medium text-status-done">
            <CircleDot className="size-3.5" /> Dokončeno {formatDate(task.completedAt)}
          </p>
        ) : null}
      </div>
    </dl>
  );

  return (
    <div className={cn('flex min-h-0 flex-col', variant === 'sheet' && 'h-full')}>
      {/* Hlavička */}
      <div
        className={cn(
          'flex items-center gap-2 border-b border-border',
          variant === 'sheet' ? 'h-14 shrink-0 px-5' : 'pb-4',
        )}
      >
        <Link
          to={`/projects/${task.project.id}/board`}
          className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <ProjectIcon icon={task.project.icon} color={task.project.color} size="xs" />
          <span className="truncate">{task.project.name}</span>
        </Link>
        <span className="text-subtle-foreground">/</span>
        <span className="font-mono text-[13px] font-medium" data-testid="task-key">
          {task.key}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {variant === 'sheet' ? (
            <Tooltip content="Otevřít na celé stránce">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link to={`/tasks/${task.key}`} aria-label="Otevřít na celé stránce">
                  <ExternalLink />
                </Link>
              </Button>
            </Tooltip>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Další akce">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void copyLink()}>
                <Link2 /> Kopírovat odkaz
              </DropdownMenuItem>
              {deletable ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
                    <Trash2 /> Smazat úkol
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {onClose ? (
            <Button variant="ghost" size="icon-sm" aria-label="Zavřít" onClick={onClose}>
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn('min-h-0 flex-1', variant === 'sheet' && 'overflow-y-auto')}>
        <div
          className={cn(
            variant === 'page' ? 'grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid gap-6 p-5 sm:p-6',
          )}
        >
          <div className="min-w-0">
            <EditableTitle value={task.title} editable={editable} onSave={(title) => save({ title })} />
            {task.projectArchived ? (
              <p className="mt-2 text-[13px] text-muted-foreground">Projekt je archivovaný – úkol nelze upravovat.</p>
            ) : null}

            {variant === 'sheet' ? (
              <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">{properties}</div>
            ) : null}

            <EditableDescription
              value={task.description}
              editable={editable}
              saving={update.isPending}
              onSave={(description) => save({ description }, 'Popis byl uložen.')}
            />

            <Tabs defaultValue="comments" className="mt-8">
              <TabsList>
                <TabsTrigger value="comments">
                  <MessageSquare /> Komentáře
                  {task.commentCount ? (
                    <span className="tabular text-subtle-foreground">{task.commentCount}</span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History /> Historie
                </TabsTrigger>
              </TabsList>
              <TabsContent value="comments" className="mt-4">
                <TaskComments taskRef={taskRef} canComment={!task.projectArchived} myRole={task.myRole} />
              </TabsContent>
              <TabsContent value="history" className="mt-5">
                <TaskHistory taskRef={taskRef} />
              </TabsContent>
            </Tabs>
          </div>

          {variant === 'page' ? (
            <aside className="h-fit rounded-xl border border-border bg-surface p-4 shadow-card lg:sticky lg:top-6">
              {properties}
            </aside>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Smazat úkol ${task.key}?`}
        description="Úkol se smaže včetně komentářů. Záznam o smazání zůstane v historii projektu. Akci nelze vrátit."
        confirmLabel="Smazat úkol"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(taskRef, {
            onSuccess: () => {
              toast.success(`Úkol ${task.key} byl smazán.`);
              setConfirmDelete(false);
              if (onClose) onClose();
              else void navigate(`/projects/${task.project.id}/board`);
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </div>
  );
}

function Property({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
      <dt className="flex h-8 items-center gap-2 text-[13px] text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
