import type { Task } from '@teamflow/shared';
import {
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  Inbox,
  Activity as ActivityIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PriorityIcon, ProjectIcon, StatusIcon } from '@/components/domain';
import { PageContainer, PageHeader, PageLoader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/misc';
import { useCurrentUser } from '@/features/auth/api';
import { ActivityList } from '@/features/activity/activity-list';
import { useTaskPreview } from '@/features/tasks/use-task-preview';
import { dueState, formatDate, formatDue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDashboard } from './api';
import { CompletedChart, StatusDistribution } from './charts';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'Dobré ráno';
  if (hour < 18) return 'Dobrý den';
  return 'Dobrý večer';
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: ReactNode;
  to: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Card className="h-full p-5 transition-[border-color,box-shadow] group-hover:border-border-strong group-hover:shadow-pop">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
          <span
            className={cn(
              'grid size-8 place-items-center rounded-lg',
              tone === 'danger' && value > 0
                ? 'bg-destructive-soft text-destructive'
                : tone === 'success'
                  ? 'bg-status-done/12 text-status-done'
                  : 'bg-primary-soft text-primary-soft-foreground',
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <p
          className={cn(
            'mt-3 text-[32px] leading-none font-extrabold tracking-tight tabular',
            tone === 'danger' && value > 0 && 'text-destructive',
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-2 text-[12.5px] text-muted-foreground">{hint}</p> : null}
      </Card>
    </Link>
  );
}

function MyTaskRow({ task }: { task: Task }) {
  const preview = useTaskPreview();
  const due = dueState(task.dueDate, false);
  return (
    <li>
      <button
        type="button"
        onClick={() => preview.open(task.key)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
      >
        <StatusIcon status={task.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{task.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <ProjectIcon
              icon={task.project.icon}
              color={task.project.color}
              size="xs"
              className="size-3.5 rounded-[3px] [&_svg]:size-2.5"
            />
            <span className="font-mono">{task.key}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{task.project.name}</span>
          </p>
        </div>
        <PriorityIcon priority={task.priority} />
        <span
          className={cn(
            'w-16 shrink-0 text-right text-[12.5px] tabular',
            due === 'overdue'
              ? 'font-semibold text-destructive'
              : due === 'today'
                ? 'font-semibold text-warning'
                : 'text-muted-foreground',
          )}
        >
          {task.dueDate ? formatDue(task.dueDate) : '—'}
        </span>
      </button>
    </li>
  );
}

export function DashboardPage() {
  const user = useCurrentUser();
  const dashboard = useDashboard();

  if (dashboard.isPending) return <PageLoader />;
  if (dashboard.isError) {
    return (
      <PageContainer>
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      </PageContainer>
    );
  }

  const { stats, completedByDay, statusDistribution, recentActivity, myTasks } = dashboard.data;
  const firstName = user.name.split(' ')[0] ?? user.name;
  const hasAnyTask = statusDistribution.some((s) => s.count > 0);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <span className="text-[13px] font-semibold text-primary capitalize">
            {formatDate(new Date(), 'EEEE d. MMMM')}
          </span>
        }
        title={`${greeting()}, ${firstName}`}
        description="Přehled práce napříč vašimi aktivními projekty."
      />

      <section aria-label="Klíčové metriky" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={FolderKanban}
          label="Aktivní projekty"
          value={stats.activeProjects}
          to="/projects"
          hint="Ve stavu Aktivní"
        />
        <StatTile
          icon={CircleDashed}
          label="Otevřené úkoly"
          value={stats.openTasks}
          to="/tasks?status=BACKLOG,TODO,IN_PROGRESS,REVIEW"
          hint="Nedokončené úkoly"
        />
        <StatTile
          icon={AlarmClock}
          label="Po termínu"
          value={stats.overdueTasks}
          to="/tasks?overdue=true&sort=dueDate&order=asc"
          tone="danger"
          hint={stats.overdueTasks > 0 ? 'Vyžadují pozornost' : 'Vše v termínu'}
        />
        <StatTile
          icon={CheckCircle2}
          label="Dokončené úkoly"
          value={stats.completedTasks}
          to="/tasks?status=DONE&sort=updatedAt&order=desc"
          tone="success"
          hint={
            <>
              <span className="font-semibold text-foreground tabular">{stats.completedLast30Days}</span> za posledních
              30 dní
            </>
          }
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Dokončené úkoly" description="Počet dokončených úkolů za posledních 30 dní" />
          <div className="px-3 pt-4 pb-3">
            <CompletedChart data={completedByDay} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Úkoly podle stavu" description="Všechny úkoly v aktivních projektech" />
          <div className="p-5">
            {hasAnyTask ? (
              <StatusDistribution data={statusDistribution} />
            ) : (
              <EmptyState compact icon={Inbox} title="Zatím žádné úkoly" />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Moje přiřazené úkoly"
            description="Nedokončené, seřazené podle termínu"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tasks?assignee=me&status=BACKLOG,TODO,IN_PROGRESS,REVIEW&sort=dueDate&order=asc">
                  Vše <ArrowRight />
                </Link>
              </Button>
            }
          />
          <div className="p-2 pt-3">
            {myTasks.length ? (
              <ul className="grid">
                {myTasks.map((t) => (
                  <MyTaskRow key={t.id} task={t} />
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={CheckCircle2}
                title="Nemáte žádné otevřené úkoly"
                description="Skvělá práce! Nové úkoly se objeví zde."
              />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Aktivita týmu" description="Poslední změny ve vašich projektech" />
          <div className="p-5">
            {recentActivity.length ? (
              <ActivityList items={recentActivity} context="global" />
            ) : (
              <EmptyState compact icon={ActivityIcon} title="Zatím žádná aktivita" />
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
