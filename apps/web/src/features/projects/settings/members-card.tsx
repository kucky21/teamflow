import {
  canManageRole,
  hasProjectPermission,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLES,
  type ProjectRole,
} from '@teamflow/shared';
import { Check, LogOut, Search, UserPlus, X } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/domain/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, useUserSearch } from '@/features/auth/api';
import { useAddMember, useRemoveMember, useUpdateMemberRole } from '@/features/projects/api';
import { useProjectContext } from '@/features/projects/project-context';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export function MembersCard() {
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
              if (self) void navigate('/projects');
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
