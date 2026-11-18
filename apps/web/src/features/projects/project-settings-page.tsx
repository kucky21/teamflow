import {
  canManageRole,
  createLabelSchema,
  hasProjectPermission,
  PALETTE_COLORS,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLES,
  PROJECT_STATUS_LABELS,
  type Label,
  type ProjectRole,
} from '@teamflow/shared';
import { Archive, ArchiveRestore, Check, LogOut, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { LabelChip, ProjectIcon, UserAvatar } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge, Card, CardHeader, Select, Skeleton } from '@/components/ui/misc';
import { useCurrentUser, useUserSearch } from '@/features/auth/api';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  useAddMember,
  useArchiveProject,
  useDeleteProject,
  useLabelMutations,
  useRemoveMember,
  useUpdateMemberRole,
} from './api';
import { ProjectFormDialog } from './project-form-dialog';
import { useProjectContext } from './project-context';

export function ProjectSettingsPage() {
  const { project } = useProjectContext();
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = !project.archivedAt && hasProjectPermission(project.myRole, 'project:update');

  return (
    <div className="mx-auto grid max-w-4xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader
          title="Obecné"
          description="Základní informace o projektu."
          action={
            canEdit ? (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Upravit
              </Button>
            ) : null
          }
        />
        <dl className="grid gap-4 p-5 text-[13.5px] sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2">
            <ProjectIcon icon={project.icon} color={project.color} size="lg" />
            <div>
              <dt className="sr-only">Název</dt>
              <dd className="text-base font-bold">{project.name}</dd>
              <dd className="font-mono text-[12.5px] text-muted-foreground">{project.key}</dd>
            </div>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Popis</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {project.description || <span className="text-subtle-foreground">Bez popisu</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Stav</dt>
            <dd className="mt-1">{PROJECT_STATUS_LABELS[project.status]}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Vlastník</dt>
            <dd className="mt-1 flex items-center gap-2">
              <UserAvatar user={project.owner} size="xs" className="ring-0" /> {project.owner.name}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Vytvořeno</dt>
            <dd className="mt-1">{formatDate(project.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Vaše role</dt>
            <dd className="mt-1">{PROJECT_ROLE_LABELS[project.myRole]}</dd>
          </div>
        </dl>
      </Card>

      <MembersCard />
      <LabelsCard />
      <DangerZone />

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
    </div>
  );
}

function MembersCard() {
  const { project } = useProjectContext();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const updateRole = useUpdateMemberRole(project.id);
  const remove = useRemoveMember(project.id);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const readOnly = Boolean(project.archivedAt);
  const canManage = !readOnly && hasProjectPermission(project.myRole, 'member:manage');

  const roleOptions = PROJECT_ROLES.filter((r) => canManageRole(project.myRole, r)).map((r) => ({
    value: r,
    label: PROJECT_ROLE_LABELS[r],
  }));

  return (
    <Card>
      <CardHeader
        title="Členové týmu"
        description="Role určují oprávnění: administrátor spravuje vše, manažer projekt a členy, člen pracuje s úkoly."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus /> Přidat člena
            </Button>
          ) : null
        }
      />
      <ul className="mt-3 divide-y divide-border border-t border-border" data-testid="members-list">
        {project.members.map((m) => {
          const isOwner = m.user.id === project.owner.id;
          const isMe = m.user.id === me.id;
          const editable = canManage && !isOwner && !isMe && canManageRole(project.myRole, m.role);
          return (
            <li key={m.user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <UserAvatar user={m.user} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[13.5px] font-bold">
                  {m.user.name}
                  {isMe ? <Badge>Vy</Badge> : null}
                  {isOwner ? (
                    <Badge className="border-primary/30 bg-primary-soft text-primary-soft-foreground">Vlastník</Badge>
                  ) : null}
                </p>
                <p className="truncate text-[12.5px] text-muted-foreground">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {editable ? (
                  <Select<ProjectRole>
                    size="sm"
                    className="w-48"
                    aria-label={`Role uživatele ${m.user.name}`}
                    value={m.role}
                    options={
                      roleOptions.some((o) => o.value === m.role)
                        ? roleOptions
                        : [...roleOptions, { value: m.role, label: PROJECT_ROLE_LABELS[m.role] }]
                    }
                    onValueChange={(role) =>
                      updateRole.mutate(
                        { userId: m.user.id, role },
                        {
                          onSuccess: () => toast.success(`Role uživatele ${m.user.name} byla změněna.`),
                          onError: (e) => toast.error(errorMessage(e)),
                        },
                      )
                    }
                  />
                ) : (
                  <span className="text-[13px] font-medium text-muted-foreground">{PROJECT_ROLE_LABELS[m.role]}</span>
                )}
                {editable ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Odebrat ${m.user.name}`}
                    onClick={() => setRemoving({ id: m.user.id, name: m.user.name })}
                  >
                    <X />
                  </Button>
                ) : isMe && !isOwner && !readOnly ? (
                  <Button variant="ghost" size="sm" onClick={() => setRemoving({ id: m.user.id, name: m.user.name })}>
                    <LogOut /> Opustit
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} roleOptions={roleOptions} />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing?.id === me.id ? 'Opustit projekt?' : `Odebrat ${removing?.name ?? ''}?`}
        description="Úkoly přiřazené tomuto členovi se uvolní (zůstanou nepřiřazené). Přístup k projektu bude okamžitě odebrán."
        confirmLabel={removing?.id === me.id ? 'Opustit projekt' : 'Odebrat člena'}
        loading={remove.isPending}
        onConfirm={() => {
          if (!removing) return;
          const self = removing.id === me.id;
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast.success(self ? 'Opustili jste projekt.' : `Uživatel ${removing.name} byl odebrán z projektu.`);
              setRemoving(null);
              if (self) navigate('/projects');
            },
            onError: (e) => toast.error(errorMessage(e)),
          });
        }}
      />
    </Card>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  roleOptions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roleOptions: { value: ProjectRole; label: string }[];
}) {
  const { project } = useProjectContext();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectRole>('MEMBER');
  const users = useUserSearch(deferred, project.id, open);
  const add = useAddMember(project.id);

  const reset = () => {
    setQuery('');
    setSelected(null);
    setRole('MEMBER');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader
          title="Přidat člena"
          description="Vyhledejte registrovaného uživatele podle jména nebo e-mailu."
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jméno nebo e-mail…"
            className="pl-8"
            aria-label="Hledat uživatele"
          />
        </div>
        <ul
          className="-mt-2 max-h-64 overflow-y-auto rounded-lg border border-border"
          role="listbox"
          aria-label="Uživatelé"
        >
          {users.isPending ? (
            <li className="p-3">
              <Skeleton className="h-8" />
            </li>
          ) : users.data?.length ? (
            users.data.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === u.id}
                  onClick={() => setSelected(u.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent',
                    selected === u.id && 'bg-primary-soft hover:bg-primary-soft',
                  )}
                >
                  <UserAvatar user={u} size="sm" className="ring-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{u.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{u.email}</span>
                  </span>
                  {selected === u.id ? <Check className="size-4 text-primary" /> : null}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              {deferred ? 'Žádný uživatel nenalezen.' : 'Všichni registrovaní uživatelé už jsou členy.'}
            </li>
          )}
        </ul>
        <div className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Role</span>
          <Select aria-label="Role nového člena" value={role} onValueChange={setRole} options={roleOptions} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            disabled={!selected}
            loading={add.isPending}
            onClick={() =>
              selected &&
              add.mutate(
                { userId: selected, role },
                {
                  onSuccess: (member) => {
                    toast.success(`Uživatel ${member.user.name} byl přidán do projektu.`);
                    onOpenChange(false);
                    reset();
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                },
              )
            }
          >
            Přidat do projektu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabelsCard() {
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

function DangerZone() {
  const { project } = useProjectContext();
  const navigate = useNavigate();
  const archive = useArchiveProject(project.id);
  const del = useDeleteProject(project.id);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');

  if (!hasProjectPermission(project.myRole, 'project:archive')) return null;
  const archived = Boolean(project.archivedAt);

  return (
    <Card className="border-destructive/30">
      <CardHeader title="Nebezpečná zóna" description="Tyto akce ovlivní všechny členy projektu." />
      <div className="grid gap-0 divide-y divide-border p-5 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-[13.5px] font-bold">{archived ? 'Obnovit projekt z archivu' : 'Archivovat projekt'}</p>
            <p className="text-[13px] text-muted-foreground">
              {archived
                ? 'Projekt bude opět aktivní a upravitelný.'
                : 'Projekt bude jen pro čtení a zmizí z přehledů. Archivaci lze kdykoli vrátit.'}
            </p>
          </div>
          {archived ? (
            <Button
              variant="secondary"
              loading={archive.isPending}
              onClick={() =>
                archive.mutate(false, {
                  onSuccess: () => toast.success('Projekt byl obnoven z archivu.'),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              <ArchiveRestore /> Obnovit
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmArchive(true)}>
              <Archive /> Archivovat
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-[13.5px] font-bold">Smazat projekt</p>
            <p className="text-[13px] text-muted-foreground">
              {archived
                ? 'Trvale odstraní projekt včetně úkolů, komentářů a historie.'
                : 'Smazat lze pouze archivovaný projekt.'}
            </p>
          </div>
          <Button variant="destructive" disabled={!archived} onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Smazat projekt
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archivovat projekt ${project.name}?`}
        description="Projekt bude pouze pro čtení. Úkoly zůstanou zachovány a projekt lze později obnovit."
        confirmLabel="Archivovat"
        destructive={false}
        loading={archive.isPending}
        onConfirm={() =>
          archive.mutate(true, {
            onSuccess: () => {
              toast.success('Projekt byl archivován.');
              setConfirmArchive(false);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />

      <Dialog
        open={confirmDelete}
        onOpenChange={(o) => {
          setConfirmDelete(o);
          if (!o) setTyped('');
        }}
      >
        <DialogContent>
          <DialogHeader
            title="Trvale smazat projekt?"
            description={
              <>
                Tato akce je nevratná. Pro potvrzení napište klíč projektu{' '}
                <strong className="font-mono">{project.key}</strong>.
              </>
            }
          />
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Klíč projektu pro potvrzení"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              disabled={typed.trim().toUpperCase() !== project.key}
              loading={del.isPending}
              onClick={() =>
                del.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Projekt byl smazán.');
                    navigate('/projects', { replace: true });
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              Smazat navždy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
