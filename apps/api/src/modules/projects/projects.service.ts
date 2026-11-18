import {
  PROJECT_STATUS_LABELS,
  type ProjectDetail,
  type ProjectSummary,
  type TaskCounts,
  type UpdateProjectInput,
  type createProjectSchema,
} from '@teamflow/shared';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { conflict, isUniqueViolation } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { iso, todayUtc } from '../../domain/dates.js';
import { compactChanges, diffField, diffText } from '../../domain/task-changes.js';
import type { AccessService } from '../access/access.service.js';
import type { ActivityService } from '../activity/activity.service.js';
import { toLabel, toProjectRef, toUserSummary, userSummarySelect } from '../mappers.js';

type CreateProjectData = z.output<typeof createProjectSchema>;

const projectInclude = {
  owner: { select: userSummarySelect },
  members: {
    include: { user: { select: userSummarySelect } },
    orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
  },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

const EMPTY_COUNTS: TaskCounts = { total: 0, open: 0, done: 0, overdue: 0 };

export class ProjectService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
    private readonly activity: ActivityService,
  ) {}

  async list(userId: string, options: { archived?: boolean | undefined }): Promise<ProjectSummary[]> {
    const rows = await this.db.project.findMany({
      where: {
        members: { some: { userId } },
        archivedAt: options.archived ? { not: null } : null,
      },
      include: projectInclude,
      orderBy: [{ name: 'asc' }],
    });
    const counts = await this.taskCounts(rows.map((r) => r.id));
    return rows.map((row) => this.toSummary(row, userId, counts.get(row.id) ?? EMPTY_COUNTS));
  }

  async get(projectId: string, userId: string): Promise<ProjectDetail> {
    await this.access.project(projectId, userId, 'project:view', { allowArchived: true });
    return this.detail(projectId, userId);
  }

  async create(userId: string, input: CreateProjectData): Promise<ProjectDetail> {
    try {
      const project = await this.db.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            key: input.key,
            name: input.name,
            description: input.description || null,
            color: input.color,
            icon: input.icon,
            status: input.status,
            ownerId: userId,
            members: { create: { userId, role: 'ADMIN' } },
          },
        });
        await this.activity.record(tx, {
          type: 'PROJECT_CREATED',
          projectId: created.id,
          actorId: userId,
          meta: { projectName: created.name },
        });
        return created;
      });
      return this.detail(project.id, userId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(`Klíč projektu „${input.key}“ je již použitý.`, 'PROJECT_KEY_TAKEN');
      }
      throw error;
    }
  }

  async update(projectId: string, userId: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    await this.db.$transaction(async (tx) => {
      const { project } = await this.access.project(projectId, userId, 'project:update', { db: tx });
      const changes = compactChanges([
        input.name !== undefined ? diffField('name', project.name, input.name) : null,
        input.description !== undefined ? diffText('description', project.description, input.description) : null,
        input.status !== undefined
          ? diffField('status', PROJECT_STATUS_LABELS[project.status], PROJECT_STATUS_LABELS[input.status])
          : null,
        input.color !== undefined ? diffField('color', project.color, input.color) : null,
        input.icon !== undefined ? diffField('icon', project.icon, input.icon) : null,
      ]);
      if (changes.length === 0) return;
      await tx.project.update({
        where: { id: projectId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
        },
      });
      await this.activity.record(tx, { type: 'PROJECT_UPDATED', projectId, actorId: userId, changes });
    });
    return this.detail(projectId, userId);
  }

  async setArchived(projectId: string, userId: string, archived: boolean): Promise<ProjectDetail> {
    await this.db.$transaction(async (tx) => {
      const { project } = await this.access.project(projectId, userId, 'project:archive', {
        db: tx,
        allowArchived: true,
      });
      if (Boolean(project.archivedAt) === archived) return;
      await tx.project.update({ where: { id: projectId }, data: { archivedAt: archived ? new Date() : null } });
      await this.activity.record(tx, {
        type: archived ? 'PROJECT_ARCHIVED' : 'PROJECT_UNARCHIVED',
        projectId,
        actorId: userId,
      });
    });
    return this.detail(projectId, userId);
  }

  /**
   * Smazání je nevratné a kaskádově odstraní úkoly, komentáře, štítky i historii.
   * Proto je povoleno jen administrátorovi a jen u archivovaného projektu.
   */
  async remove(projectId: string, userId: string): Promise<void> {
    const { project } = await this.access.project(projectId, userId, 'project:delete', { allowArchived: true });
    if (!project.archivedAt) {
      throw conflict('Před smazáním musí být projekt archivován.', 'PROJECT_NOT_ARCHIVED');
    }
    await this.db.project.delete({ where: { id: projectId } });
  }

  private async detail(projectId: string, userId: string): Promise<ProjectDetail> {
    const row = await this.db.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { ...projectInclude, labels: { orderBy: { name: 'asc' } } },
    });
    const counts = await this.taskCounts([projectId]);
    return {
      ...this.toSummary(row, userId, counts.get(projectId) ?? EMPTY_COUNTS),
      members: row.members.map((m) => ({ user: toUserSummary(m.user), role: m.role, joinedAt: iso(m.joinedAt) })),
      labels: row.labels.map(toLabel),
    };
  }

  private toSummary(row: ProjectRow, userId: string, taskCounts: TaskCounts): ProjectSummary {
    const me = row.members.find((m) => m.userId === userId);
    return {
      ...toProjectRef(row),
      description: row.description,
      status: row.status,
      archivedAt: iso(row.archivedAt),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      owner: toUserSummary(row.owner),
      myRole: me?.role ?? 'MEMBER',
      memberCount: row.members.length,
      membersPreview: row.members.slice(0, 5).map((m) => toUserSummary(m.user)),
      taskCounts,
    };
  }

  private async taskCounts(projectIds: string[]): Promise<Map<string, TaskCounts>> {
    const result = new Map<string, TaskCounts>();
    if (projectIds.length === 0) return result;
    const [byStatus, overdue] = await Promise.all([
      this.db.task.groupBy({
        by: ['projectId', 'status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      this.db.task.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: { not: 'DONE' }, dueDate: { lt: todayUtc() } },
        _count: { _all: true },
      }),
    ]);
    for (const row of byStatus) {
      const c = result.get(row.projectId) ?? { ...EMPTY_COUNTS };
      c.total += row._count._all;
      if (row.status === 'DONE') c.done += row._count._all;
      else c.open += row._count._all;
      result.set(row.projectId, c);
    }
    for (const row of overdue) {
      const c = result.get(row.projectId) ?? { ...EMPTY_COUNTS };
      c.overdue = row._count._all;
      result.set(row.projectId, c);
    }
    return result;
  }
}
