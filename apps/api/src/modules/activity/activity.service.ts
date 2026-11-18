import type { ActivityChange, ActivityPage, ActivityQuery, ActivityType } from '@teamflow/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Db, DbClient } from '../../lib/prisma.js';
import type { AccessService } from '../access/access.service.js';
import { activityInclude, toActivityDto } from '../mappers.js';

export interface ActivityEntry {
  type: ActivityType;
  projectId: string;
  actorId: string;
  taskId?: string | null;
  /** Snapshot klíče a názvu úkolu – historie zůstane čitelná i po smazání úkolu. */
  task?: { key: string; title: string };
  changes?: ActivityChange[];
  meta?: Record<string, string>;
}

export class ActivityService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
  ) {}

  /** Zapíše auditní záznam. Volá se uvnitř transakce spolu se samotnou změnou. */
  async record(db: DbClient, entry: ActivityEntry): Promise<void> {
    const meta: Record<string, string> = { ...entry.meta };
    if (entry.task) {
      meta['taskKey'] = entry.task.key;
      meta['taskTitle'] = entry.task.title;
    }
    await db.activityLog.create({
      data: {
        type: entry.type,
        projectId: entry.projectId,
        actorId: entry.actorId,
        taskId: entry.taskId ?? null,
        changes: (entry.changes ?? []) as unknown as Prisma.InputJsonValue,
        meta,
      },
    });
  }

  async listForProject(projectId: string, userId: string, query: ActivityQuery): Promise<ActivityPage> {
    await this.access.project(projectId, userId, 'project:view', { allowArchived: true });
    return this.page({ projectId }, query);
  }

  async listForTask(taskRef: string, userId: string, query: ActivityQuery): Promise<ActivityPage> {
    const { task } = await this.access.task(taskRef, userId, 'project:view', { allowArchived: true });
    return this.page({ taskId: task.id }, query);
  }

  /** Aktivity napříč projekty, kde je uživatel členem (pro dashboard). */
  async listForUser(userId: string, limit: number) {
    const rows = await this.db.activityLog.findMany({
      where: { project: { archivedAt: null, members: { some: { userId } } } },
      include: activityInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.map(toActivityDto);
  }

  private async page(where: Prisma.ActivityLogWhereInput, query: ActivityQuery): Promise<ActivityPage> {
    const rows = await this.db.activityLog.findMany({
      where,
      include: activityInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    return {
      items: items.map(toActivityDto),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }
}
