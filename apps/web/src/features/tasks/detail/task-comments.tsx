import { canDeleteComment, type Comment, commentBodySchema, type TaskDetail as TaskDetailDto } from '@teamflow/shared';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/domain/user-avatar';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/features/auth/api';
import { useCommentMutations, useTaskComments } from '@/features/tasks/api';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatRelative } from '@/lib/format';

export function TaskComments({
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
