import { PROJECT_ROLE_LABELS, PROJECT_STATUS_LABELS, type ProjectSummary } from '@teamflow/shared';
import { Archive, FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { AvatarStack, ProjectIcon } from '@/components/domain';
import { PageContainer, PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Badge, Card, Skeleton, Tabs, TabsList, TabsTrigger } from '@/components/ui/misc';
import { formatDate } from '@/lib/format';
import { cn, plural } from '@/lib/utils';
import { useProjects } from './api';
import { ProjectFormDialog } from './project-form-dialog';

const STATUS_TONE: Record<ProjectSummary['status'], string> = {
  PLANNING: 'bg-status-review/12 text-status-review border-status-review/25',
  ACTIVE: 'bg-status-done/12 text-status-done border-status-done/25',
  ON_HOLD: 'bg-status-progress/15 text-status-progress border-status-progress/30',
  COMPLETED: 'bg-muted text-muted-foreground',
};

export function ProjectStatusBadge({ status }: { status: ProjectSummary['status'] }) {
  return <Badge className={STATUS_TONE[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const { total, done, open, overdue } = project.taskCounts;
  const progress = total ? Math.round((done / total) * 100) : 0;
  return (
    <Link
      to={`/projects/${project.id}/board`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Card className="flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] group-hover:-translate-y-0.5 group-hover:border-border-strong group-hover:shadow-pop">
        <div className="flex items-start gap-3">
          <ProjectIcon icon={project.icon} color={project.color} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15.5px] font-bold tracking-tight">{project.name}</h3>
            </div>
            <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{project.key}</p>
          </div>
          {project.archivedAt ? <Badge>Archiv</Badge> : <ProjectStatusBadge status={project.status} />}
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[13.5px] leading-relaxed text-muted-foreground">
          {project.description || 'Bez popisu.'}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-semibold">
              {done}/{total} hotovo
            </span>
            <span className="text-muted-foreground tabular">{progress} %</span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Dokončeno"
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${progress}%`, background: project.color }}
            />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
          <AvatarStack users={project.membersPreview} />
          <div className="flex items-center gap-3 text-[12.5px] text-muted-foreground">
            <span>
              {open} {plural(open, ['otevřený', 'otevřené', 'otevřených'])}
            </span>
            {overdue > 0 ? <span className="font-semibold text-destructive">{overdue} po termínu</span> : null}
          </div>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-[12px] text-subtle-foreground">
          {PROJECT_ROLE_LABELS[project.myRole]} · vytvořeno {formatDate(project.createdAt)}
        </p>
      </Card>
    </Link>
  );
}

export function ProjectsPage() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const projects = useProjects(tab === 'archived');

  return (
    <PageContainer>
      <PageHeader
        title="Projekty"
        description="Všechny projekty, ve kterých jste členem."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Nový projekt
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
        <TabsList>
          <TabsTrigger value="active">
            <FolderKanban /> Aktivní
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive /> Archivované
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-5">
        {projects.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : projects.isError ? (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
        ) : projects.data.length === 0 ? (
          <Card>
            {tab === 'active' ? (
              <EmptyState
                icon={FolderKanban}
                title="Zatím nemáte žádný projekt"
                description="Založte první projekt a pozvěte do něj tým. Úkoly pak můžete plánovat na Kanbanu."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus /> Vytvořit projekt
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Archive}
                title="Archiv je prázdný"
                description="Archivované projekty jsou jen pro čtení a nezapočítávají se do přehledů."
              />
            )}
          </Card>
        ) : (
          <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', projects.isFetching && 'opacity-80')}>
            {projects.data.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}
