import {
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ProjectIcon } from '@/components/domain/project-icon';
import { UserAvatar } from '@/components/domain/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, useLogout } from '@/features/auth/api';
import { useProjects } from '@/features/projects/api';
import { ProjectFormDialog } from '@/features/projects/project-form-dialog';
import { type ThemePreference, useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

import { Logo } from './logo';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-semibold transition-colors',
    isActive
      ? 'bg-surface text-foreground shadow-xs ring-1 ring-border'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-[13px] text-subtle-foreground shadow-xs transition-colors hover:border-border-strong hover:text-muted-foreground"
        >
          <Search className="size-4" />
          Hledat úkoly…
          <SearchHint />
        </button>
      </div>

      <nav aria-label="Hlavní navigace" className="mt-4 grid gap-0.5 px-3">
        <NavLink to="/" end className={navItemClass}>
          <LayoutDashboard className="size-4" /> Přehled
        </NavLink>
        <NavLink to="/tasks" className={navItemClass}>
          <ListTodo className="size-4" /> Úkoly
        </NavLink>
        <NavLink to="/projects" end className={navItemClass}>
          <FolderKanban className="size-4" /> Projekty
        </NavLink>
      </nav>

      <div className="mt-6 flex items-center justify-between px-5">
        <span className="text-[11px] font-bold tracking-wider text-subtle-foreground uppercase">Projekty</span>
        <Button variant="ghost" size="icon-xs" aria-label="Nový projekt" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      <nav aria-label="Projekty" className="mt-1.5 grid min-h-0 flex-1 auto-rows-min gap-0.5 overflow-y-auto px-3 pb-4">
        {projects.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)
        ) : projects.data?.length ? (
          projects.data.map((p) => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className={navItemClass}>
              <ProjectIcon icon={p.icon} color={p.color} size="xs" />
              <span className="truncate">{p.name}</span>
              {p.taskCounts.open > 0 ? (
                <span className="ml-auto text-[11.5px] font-semibold text-subtle-foreground tabular">
                  {p.taskCounts.open}
                </span>
              ) : null}
            </NavLink>
          ))
        ) : (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-md border border-dashed border-border-strong px-3 py-3 text-left text-[13px] text-muted-foreground hover:bg-accent"
          >
            Zatím žádné projekty. <span className="font-semibold text-primary">Vytvořit první</span>
          </button>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu />
      </div>

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Světlý', icon: Sun },
  { value: 'dark', label: 'Tmavý', icon: Moon },
  { value: 'system', label: 'Podle systému', icon: Monitor },
];

function UserMenu() {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { preference, setPreference } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-accent"
          data-testid="user-menu"
        >
          <UserAvatar user={user} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold">{user.name}</span>
            <span className="block truncate text-[12px] text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 text-subtle-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> Nastavení účtu
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Motiv</DropdownMenuLabel>
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuCheckItem
            key={value}
            checked={preference === value}
            onSelect={(e) => {
              e.preventDefault();
              setPreference(value);
            }}
          >
            <Icon /> {label}
          </DropdownMenuCheckItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            logout.mutate(undefined, {
              onSuccess: () => toast.success('Byli jste odhlášeni.'),
            })
          }
        >
          <LogOut /> Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchHint() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  return (
    <span className="ml-auto hidden items-center gap-0.5 sm:flex">
      <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
      <Kbd>K</Kbd>
    </span>
  );
}
