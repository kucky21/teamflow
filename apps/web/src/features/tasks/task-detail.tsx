import {
  canDeleteComment,
  canDeleteTask,
  commentBodySchema,
  hasProjectPermission,
  type Comment,
  type TaskDetail as TaskDetailDto,
  type UpdateTaskInput,
} from '@teamflow/shared';
import {
  Calendar,
  CircleDot,
  Clock,
  ExternalLink,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Signal,
  Tags,
  Trash2,
  UserRound,
  History,
  X,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ProjectIcon, UserAvatar } from '@/components/domain';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/menu';
import { Kbd, Select, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc';
import { useCurrentUser } from '@/features/auth/api';
import { ActivityList } from '@/features/activity/activity-list';
import { useProject } from '@/features/projects/api';
import { errorMessage } from '@/lib/api';
import { dueState, formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCommentMutations, useDeleteTask, useTask, useTaskComments, useTaskHistory, useUpdateTask } from './api';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from './options';
import { AssigneeSelect, LabelPicker } from './pickers';

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
                <Comments taskRef={taskRef} canComment={!task.projectArchived} myRole={task.myRole} />
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
              else navigate(`/projects/${task.project.id}/board`);
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

function EditableTitle({ value, editable, onSave }: { value: string; editable: boolean; onSave: (v: string) => void }) {
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

function EditableDescription({
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

function Comments({
  taskRef,
  canComment,
  myRole,
}: {
  taskRef: string;
  canComment: boolean;
  myRole: TaskDetailDto['myRole'];
}) {
  const comments = useTaskComments(taskRef);
  const mutations = useCommentMutations(taskRef);
  const me = useCurrentUser();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = () => {
    const parsed = commentBodySchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Neplatný komentář');
      return;
    }
    setError(null);
    mutations.create.mutate(parsed.data, {
      onSuccess: () => setDraft(''),
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  return (
    <div className="grid gap-5">
      {comments.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : comments.isError ? (
        <ErrorState error={comments.error} onRetry={() => void comments.refetch()} />
      ) : comments.data.length === 0 ? (
        <EmptyState compact icon={MessageSquare} title="Zatím žádné komentáře" description="Začněte diskusi k úkolu." />
      ) : (
        <ul className="grid gap-4">
          {comments.data.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              canEdit={canComment && c.author.id === me.id}
              canDelete={canComment && canDeleteComment(myRole, c.author.id === me.id)}
              onUpdate={(body) =>
                mutations.update.mutateAsync({ id: c.id, body }).catch((e: unknown) => {
                  toast.error(errorMessage(e));
                  throw e;
                })
              }
              onDelete={() =>
                mutations.remove.mutate(c.id, {
                  onSuccess: () => toast.success('Komentář byl smazán.'),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            />
          ))}
        </ul>
      )}

      {canComment ? (
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-3"
        >
          <UserAvatar user={me} size="sm" className="mt-1 size-7" />
          <div className="grid flex-1 gap-2">
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Napište komentář…"
              aria-label="Nový komentář"
              aria-invalid={error ? true : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {error ? <p className="text-[12.5px] font-medium text-destructive">{error}</p> : null}
            <div className="flex items-center justify-between gap-2">
              <span className="hidden items-center gap-1 text-[12px] text-subtle-foreground sm:flex">
                <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> pro odeslání
              </span>
              <Button type="submit" size="sm" className="ml-auto" loading={mutations.create.isPending}>
                Přidat komentář
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function CommentItem({
  comment,
  canEdit,
  canDelete,
  onUpdate,
  onDelete,
}: {
  comment: Comment;
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: (body: string) => Promise<unknown>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <li className="group flex gap-3">
      <UserAvatar user={comment.author} size="sm" className="mt-0.5 size-7" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-bold">{comment.author.name}</span>
          <Tooltip content={formatDateTime(comment.createdAt)}>
            <time dateTime={comment.createdAt} className="text-subtle-foreground">
              {formatRelative(comment.createdAt)}
            </time>
          </Tooltip>
          {comment.edited ? <span className="text-[12px] text-subtle-foreground">(upraveno)</span> : null}
          {(canEdit || canDelete) && !editing ? (
            <div className="ml-auto flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              {canEdit ? (
                <Button variant="ghost" size="icon-xs" aria-label="Upravit komentář" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button variant="ghost" size="icon-xs" aria-label="Smazat komentář" onClick={() => setConfirm(true)}>
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {editing ? (
          <div className="mt-1.5 grid gap-2">
            <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Upravit komentář" />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(false);
                }}
              >
                Zrušit
              </Button>
              <Button
                size="sm"
                loading={saving}
                disabled={!draft.trim()}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onUpdate(draft.trim());
                    setEditing(false);
                  } catch {
                    /* chyba je zobrazena toastem */
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Uložit
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 rounded-lg rounded-tl-sm border border-border bg-surface px-3 py-2 text-[14px] leading-relaxed whitespace-pre-wrap shadow-xs">
            {comment.body}
          </p>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Smazat komentář?"
        description="Komentář bude trvale odstraněn."
        confirmLabel="Smazat"
        onConfirm={() => {
          setConfirm(false);
          onDelete();
        }}
      />
    </li>
  );
}

function TaskHistory({ taskRef }: { taskRef: string }) {
  const history = useTaskHistory(taskRef);
  if (history.isPending) return <Skeleton className="h-32" />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  const items = history.data.pages.flatMap((p) => p.items);
  if (items.length === 0) return <EmptyState compact icon={History} title="Žádné změny" />;
  return (
    <div>
      <ActivityList items={items} context="task" />
      {history.hasNextPage ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          loading={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          Načíst starší
        </Button>
      ) : null}
    </div>
  );
}
