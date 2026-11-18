import { type Dashboard, TASK_STATUSES, type TaskStatus } from '@teamflow/shared';

import type { Db } from '../../lib/prisma.js';
import type { ActivityService } from '../activity/activity.service.js';
import { taskInclude, toTaskDto } from '../mappers.js';

interface StatsRow {
  active_projects: number;
  open_tasks: number;
  overdue_tasks: number;
  completed_tasks: number;
  completed_30d: number;
}

/**
 * Agregace pro úvodní přehled. Počítá se v PostgreSQL nad projekty,
 * kde je uživatel členem (archivované projekty se nezapočítávají).
 * Dny se seskupují v časovém pásmu klienta.
 */
export class DashboardService {
  constructor(
    private readonly db: Db,
    private readonly activity: ActivityService,
  ) {}

  async get(userId: string, tz: string): Promise<Dashboard> {
    const [stats, byDay, byStatus, recentActivity, myTasks] = await Promise.all([
      this.stats(userId, tz),
      this.completedByDay(userId, tz),
      this.statusDistribution(userId),
      this.activity.listForUser(userId, 12),
      this.myTasks(userId),
    ]);
    return { stats, completedByDay: byDay, statusDistribution: byStatus, recentActivity, myTasks };
  }

  private async stats(userId: string, tz: string): Promise<Dashboard['stats']> {
    const [row] = await this.db.$queryRaw<StatsRow[]>`
      WITH my_projects AS (
        SELECT p.id, p.status
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}::uuid
        WHERE p.archived_at IS NULL
      ),
      today AS (SELECT (now() AT TIME ZONE ${tz})::date AS d)
      SELECT
        (SELECT count(*) FROM my_projects WHERE status = 'ACTIVE')::int AS active_projects,
        count(t.id) FILTER (WHERE t.status <> 'DONE')::int AS open_tasks,
        count(t.id) FILTER (WHERE t.status <> 'DONE' AND t.due_date < (SELECT d FROM today))::int AS overdue_tasks,
        count(t.id) FILTER (WHERE t.status = 'DONE')::int AS completed_tasks,
        count(t.id) FILTER (
          WHERE t.status = 'DONE'
            AND (t.completed_at AT TIME ZONE ${tz})::date > (SELECT d FROM today) - 30
        )::int AS completed_30d
      FROM my_projects mp
      LEFT JOIN tasks t ON t.project_id = mp.id`;
    return {
      activeProjects: row?.active_projects ?? 0,
      openTasks: row?.open_tasks ?? 0,
      overdueTasks: row?.overdue_tasks ?? 0,
      completedTasks: row?.completed_tasks ?? 0,
      completedLast30Days: row?.completed_30d ?? 0,
    };
  }

  private async completedByDay(userId: string, tz: string): Promise<Dashboard['completedByDay']> {
    const rows = await this.db.$queryRaw<{ date: string; count: number }[]>`
      WITH days AS (
        SELECT generate_series(
          (now() AT TIME ZONE ${tz})::date - 29,
          (now() AT TIME ZONE ${tz})::date,
          interval '1 day'
        )::date AS day
      ),
      done AS (
        SELECT (t.completed_at AT TIME ZONE ${tz})::date AS day
        FROM tasks t
        JOIN projects p ON p.id = t.project_id AND p.archived_at IS NULL
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}::uuid
        WHERE t.status = 'DONE'
          AND t.completed_at >= now() - interval '31 days'
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date, count(done.day)::int AS count
      FROM days d
      LEFT JOIN done ON done.day = d.day
      GROUP BY d.day
      ORDER BY d.day`;
    return rows.map((r) => ({ date: r.date, count: r.count }));
  }

  private async statusDistribution(userId: string): Promise<Dashboard['statusDistribution']> {
    const groups = await this.db.task.groupBy({
      by: ['status'],
      where: { project: { archivedAt: null, members: { some: { userId } } } },
      _count: { _all: true },
    });
    const counts = new Map<TaskStatus, number>(groups.map((g) => [g.status, g._count._all]));
    return TASK_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }

  private async myTasks(userId: string) {
    const rows = await this.db.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: 'DONE' },
        project: { archivedAt: null, members: { some: { userId } } },
      },
      include: taskInclude,
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }, { updatedAt: 'desc' }],
      take: 8,
    });
    return rows.map(toTaskDto);
  }
}
