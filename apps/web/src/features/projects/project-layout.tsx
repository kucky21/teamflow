import { hasProjectPermission, type TaskStatus } from '@teamflow/shared';
import { Archive, History, KanbanSquare, List, Plus, Settings } from 'lucide-react';
import { Suspense, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router';

import { NotFoundPage } from '@/app/not-found-page';
import { ProjectIcon } from '@/components/domain/project-icon';
import { AvatarStack } from '@/components/domain/user-avatar';
import { PageLoader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { useProject } from './api';
import { ProjectContext, type ProjectContextValue } from './project-context';
import { ProjectStatusBadge } from './projects-page';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex h-10 items-center gap-2 px-1 text-[13.5px] font-semibold whitespace-nowrap transition-colors [&_svg]:size-4',
    isActive
      ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
      : 'text-muted-foreground hover:text-foreground',
  );

export function ProjectLayout() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus | undefined>();

  if (project.isPending) {
    return (
      <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="grid gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="mt-6 h-10 w-80" />
      </div>
    );
  }
  if (project.isError) {
    if (project.error instanceof ApiError && project.error.status === 404) return <NotFoundPage />;
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;
  }

  const p = project.data;
  const readOnly = Boolean(p.archivedAt);
  const canEdit = hasProjectPermission(p.myRole, 'project:update');
  const canCreate = !readOnly && hasProjectPermission(p.myRole, 'task:create');
  const value: ProjectContextValue = {
    project: p,
    canEdit,
    readOnly,
    openCreateTask: (status) => {
      setCreateStatus(status);
      setCreateOpen(true);
    },
  };

  return (
    <ProjectContext.Provider value={value}>
      <div className="border-b border-border bg-surface/60">
        <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <ProjectIcon icon={p.icon} color={p.color} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[22px] font-extrabold tracking-tight">{p.name}</h1>
                  <ProjectStatusBadge status={p.status} />
                </div>
                <p className="mt-0.5 line-clamp-1 max-w-2xl text-[13.5px] text-muted-foreground">
                  <span className="font-mono">{p.key}</span>
                  {p.description ? <> · {p.description}</> : null}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AvatarStack users={p.members.map((m) => m.user)} max={5} />
              {canCreate ? (
                <Button onClick={() => value.openCreateTask()}>
                  <Plus /> Nový úkol
                </Button>
              ) : null}
            </div>
          </div>

          {readOnly ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-status-progress/30 bg-status-progress/10 px-3 py-2 text-[13px] font-medium">
              <Archive className="size-4 text-status-progress" />
              Projekt je archivovaný – obsah je pouze pro čtení.
            </div>
          ) : null}

          <nav aria-label="Sekce projektu" className="-mb-px mt-5 flex gap-6 overflow-x-auto">
            <NavLink to="board" className={tabClass}>
              <KanbanSquare /> Kanban
            </NavLink>
            <NavLink to="tasks" className={tabClass}>
              <List /> Seznam
            </NavLink>
            <NavLink to="activity" className={tabClass}>
              <History /> Aktivita
            </NavLink>
            <NavLink to="settings" className={tabClass}>
              <Settings /> Nastavení
            </NavLink>
          </nav>
        </div>
      </div>

      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        project={p}
        {...(createStatus ? { defaultStatus: createStatus } : {})}
      />
    </ProjectContext.Provider>
  );
}
