import {
  type Board,
  type BoardQuery,
  canDeleteTask,
  type createTaskSchema,
  formatTaskKey,
  LIMITS,
  type MoveTaskInput,
  type Paginated,
  parseTaskKey,
  type Task,
  type TaskDetail,
  type TaskFilter,
  type TaskListQuery,
  type TaskStatus,
  type UpdateTaskInput,
} from '@teamflow/shared';
import type { z } from 'zod';

import { fromIsoDate, todayUtc, toIsoDate } from '../../domain/dates.js';
import { evenPositions, POSITION_STEP, positionBetween, resolveNeighbours } from '../../domain/ordering.js';
import { buildPrefixTsQuery } from '../../domain/search.js';
import { compactChanges, diffField, diffList, diffText } from '../../domain/task-changes.js';
import { Prisma } from '../../generated/prisma/client.js';
import { badRequest, forbidden } from '../../lib/errors.js';
import type { Db, DbClient } from '../../lib/prisma.js';
import type { AccessService } from '../access/access.service.js';
import type { ActivityService } from '../activity/activity.service.js';
import { taskDetailInclude, taskInclude, toTaskDetailDto, toTaskDto } from '../mappers.js';

type CreateTaskData = z.output<typeof createTaskSchema>;

export class TaskService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
    private readonly activity: ActivityService,
  ) {}

  // ---------------------------------------------------------------- čtení

  async list(userId: string, query: TaskListQuery): Promise<Paginated<Task>> {
    if (query.projectId) {
      await this.access.project(query.projectId, userId, 'project:view', { allowArchived: true });
    }
    const where = await this.buildWhere(userId, query);
    const [total, rows] = await Promise.all([
      this.db.task.count({ where }),
      this.db.task.findMany({
        where,
        include: taskInclude,
        orderBy: this.orderBy(query.sort, query.order),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(toTaskDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async board(projectId: string, userId: string, query: BoardQuery): Promise<Board> {
    await this.access.project(projectId, userId, 'project:view', { allowArchived: true });
    const where = await this.buildWhere(userId, { ...query, projectId });
    const rows = await this.db.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      take: LIMITS.boardTaskLimit + 1,
    });
    return {
      tasks: rows.slice(0, LIMITS.boardTaskLimit).map(toTaskDto),
      truncated: rows.length > LIMITS.boardTaskLimit,
    };
  }

  async get(taskRef: string, userId: string): Promise<TaskDetail> {
    const { task, role, project } = await this.access.task(taskRef, userId, 'project:view', { allowArchived: true });
    const row = await this.db.task.findUniqueOrThrow({ where: { id: task.id }, include: taskDetailInclude });
    return toTaskDetailDto(row, { myRole: role, projectArchived: project.archivedAt !== null });
  }

  // ---------------------------------------------------------------- zápis

  async create(projectId: string, userId: string, input: CreateTaskData): Promise<TaskDetail> {
    const id = await this.db.$transaction(async (tx) => {
      const { project } = await this.access.project(projectId, userId, 'task:create', { db: tx });
      if (input.assigneeId) await this.access.assertMember(projectId, input.assigneeId, tx);
      const labels = await this.resolveLabels(tx, projectId, input.labelIds);

      // Inkrement s řádkovým zámkem zaručí unikátní čísla i při souběžném zakládání.
      const { taskCounter } = await tx.project.update({
        where: { id: projectId },
        data: { taskCounter: { increment: 1 } },
        select: { taskCounter: true },
      });
      const position = await this.endOfColumn(tx, projectId, input.status);
      const task = await tx.task.create({
        data: {
          projectId,
          number: taskCounter,
          title: input.title,
          description: input.description || null,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId ?? null,
          creatorId: userId,
          dueDate: input.dueDate ? fromIsoDate(input.dueDate) : null,
          completedAt: input.status === 'DONE' ? new Date() : null,
          position,
          labels: { create: labels.map((l) => ({ labelId: l.id })) },
        },
        select: { id: true, title: true },
      });
      await this.activity.record(tx, {
        type: 'TASK_CREATED',
        projectId,
        actorId: userId,
        taskId: task.id,
        task: { key: formatTaskKey(project.key, taskCounter), title: task.title },
      });
      return task.id;
    });
    return this.get(id, userId);
  }

  async update(taskRef: string, userId: string, input: UpdateTaskInput): Promise<TaskDetail> {
    const id = await this.db.$transaction(async (tx) => {
      const { task, project } = await this.access.task(taskRef, userId, 'task:update', { db: tx });
      const current = await tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { assignee: { select: { name: true } }, labels: { include: { label: true } } },
      });

      const data: Prisma.TaskUncheckedUpdateInput = {};
      let assigneeName: string | null = current.assignee?.name ?? null;
      let labelNames = current.labels.map((l) => l.label.name);

      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description || null;
      if (input.priority !== undefined) data.priority = input.priority;
      if (input.dueDate !== undefined) data.dueDate = input.dueDate ? fromIsoDate(input.dueDate) : null;

      if (input.assigneeId !== undefined && input.assigneeId !== current.assigneeId) {
        if (input.assigneeId) {
          await this.access.assertMember(project.id, input.assigneeId, tx);
          const user = await tx.user.findUniqueOrThrow({ where: { id: input.assigneeId }, select: { name: true } });
          assigneeName = user.name;
        } else {
          assigneeName = null;
        }
        data.assigneeId = input.assigneeId;
      }

      if (input.labelIds !== undefined) {
        const labels = await this.resolveLabels(tx, project.id, input.labelIds);
        labelNames = labels.map((l) => l.name);
        data.labels = { deleteMany: {}, create: labels.map((l) => ({ labelId: l.id })) };
      }

      if (input.status !== undefined && input.status !== current.status) {
        data.status = input.status;
        data.position = await this.endOfColumn(tx, project.id, input.status);
        data.completedAt = input.status === 'DONE' ? new Date() : null;
      }

      const changes = compactChanges([
        input.title !== undefined ? diffField('title', current.title, input.title) : null,
        input.description !== undefined ? diffText('description', current.description, input.description) : null,
        input.status !== undefined ? diffField('status', current.status, input.status) : null,
        input.priority !== undefined ? diffField('priority', current.priority, input.priority) : null,
        input.dueDate !== undefined
          ? diffField('dueDate', current.dueDate ? toIsoDate(current.dueDate) : null, input.dueDate)
          : null,
        input.assigneeId !== undefined ? diffField('assignee', current.assignee?.name ?? null, assigneeName) : null,
        input.labelIds !== undefined
          ? diffList(
              'labels',
              current.labels.map((l) => l.label.name),
              labelNames,
            )
          : null,
      ]);

      if (changes.length > 0) {
        await tx.task.update({ where: { id: task.id }, data });
        await this.activity.record(tx, {
          type: 'TASK_UPDATED',
          projectId: project.id,
          actorId: userId,
          taskId: task.id,
          task: { key: formatTaskKey(project.key, task.number), title: input.title ?? current.title },
          changes,
        });
      }
      return task.id;
    });
    return this.get(id, userId);
  }

  /**
   * Přesun na Kanbanu (změna sloupce a/nebo pořadí). Projekt se zamkne
   * (`SELECT … FOR UPDATE`), takže souběžné přesuny se serializují
   * a výpočet pozice pracuje s konzistentním stavem sloupce.
   */
  async move(taskRef: string, userId: string, input: MoveTaskInput): Promise<Task> {
    if (input.prevId && input.prevId === input.nextId) {
      throw badRequest('Předchozí a následující úkol nemohou být stejné.');
    }
    return this.db.$transaction(async (tx) => {
      const { task, project } = await this.access.task(taskRef, userId, 'task:update', { db: tx });
      await tx.$executeRaw`SELECT 1 FROM projects WHERE id = ${project.id}::uuid FOR UPDATE`;

      const column = await tx.task.findMany({
        where: { projectId: project.id, status: input.status, id: { not: task.id } },
        select: { id: true, position: true },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });

      let { prev, next } = resolveNeighbours(column, input.prevId, input.nextId);
      let position = positionBetween(prev?.position ?? null, next?.position ?? null);

      if (position === null) {
        // Mezera mezi sousedy je vyčerpaná – přečíslujeme celý sloupec.
        const positions = evenPositions(column.length);
        for (const [i, item] of column.entries()) {
          item.position = positions[i] ?? (i + 1) * POSITION_STEP;
          await tx.task.update({ where: { id: item.id }, data: { position: item.position } });
        }
        ({ prev, next } = resolveNeighbours(column, input.prevId, input.nextId));
        position = positionBetween(prev?.position ?? null, next?.position ?? null) ?? POSITION_STEP;
      }

      const statusChanged = task.status !== input.status;
      const updated = await tx.task.update({
        where: { id: task.id },
        data: {
          position,
          ...(statusChanged ? { status: input.status, completedAt: input.status === 'DONE' ? new Date() : null } : {}),
        },
        include: taskInclude,
      });

      if (statusChanged) {
        await this.activity.record(tx, {
          type: 'TASK_MOVED',
          projectId: project.id,
          actorId: userId,
          taskId: task.id,
          task: { key: formatTaskKey(project.key, task.number), title: task.title },
          changes: [{ field: 'status', from: task.status, to: input.status }],
        });
      }
      return toTaskDto(updated);
    });
  }

  async remove(taskRef: string, userId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const { task, project, role } = await this.access.task(taskRef, userId, 'project:view', { db: tx });
      if (!canDeleteTask(role, task.creatorId === userId)) {
        throw forbidden('Úkol může smazat jen jeho autor nebo správce projektu.');
      }
      await this.activity.record(tx, {
        type: 'TASK_DELETED',
        projectId: project.id,
        actorId: userId,
        taskId: null,
        task: { key: formatTaskKey(project.key, task.number), title: task.title },
      });
      await tx.task.delete({ where: { id: task.id } });
    });
  }

  // ---------------------------------------------------------------- pomocné

  private async endOfColumn(db: DbClient, projectId: string, status: TaskStatus): Promise<number> {
    const last = await db.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? 0) + POSITION_STEP;
  }

  private async resolveLabels(db: DbClient, projectId: string, labelIds: string[]) {
    if (labelIds.length === 0) return [];
    const labels = await db.label.findMany({
      where: { projectId, id: { in: labelIds } },
      orderBy: { name: 'asc' },
    });
    if (labels.length !== labelIds.length) {
      throw badRequest('Některé štítky nepatří do tohoto projektu.', 'INVALID_LABELS');
    }
    return labels;
  }

  private async buildWhere(
    userId: string,
    filter: Omit<TaskFilter, 'status'> & { status?: TaskStatus[] | undefined },
  ): Promise<Prisma.TaskWhereInput> {
    const and: Prisma.TaskWhereInput[] = [{ project: { members: { some: { userId } } } }];

    if (filter.projectId) and.push({ projectId: filter.projectId });
    else and.push({ project: { archivedAt: null } });

    if (filter.status?.length) and.push({ status: { in: filter.status } });
    if (filter.priority?.length) and.push({ priority: { in: filter.priority } });

    if (filter.assigneeId === 'me') and.push({ assigneeId: userId });
    else if (filter.assigneeId === 'none') and.push({ assigneeId: null });
    else if (filter.assigneeId) and.push({ assigneeId: filter.assigneeId });

    if (filter.labelId) and.push({ labels: { some: { labelId: filter.labelId } } });
    if (filter.overdue) and.push({ dueDate: { lt: todayUtc() }, status: { not: 'DONE' } });

    if (filter.q) {
      const or: Prisma.TaskWhereInput[] = [{ id: { in: await this.searchIds(userId, filter.q, filter.projectId) } }];
      const key = parseTaskKey(filter.q);
      if (key) or.push({ number: key.number, project: { key: key.projectKey } });
      and.push({ OR: or });
    }
    return { AND: and };
  }

  /** Fulltext přes generovaný sloupec `search_vector` (GIN index, bez diakritiky). */
  private async searchIds(userId: string, q: string, projectId?: string): Promise<string[]> {
    const tsQuery = buildPrefixTsQuery(q);
    if (!tsQuery) return [];
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      SELECT t.id
      FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ${userId}::uuid
      WHERE t.search_vector @@ to_tsquery('simple', teamflow_unaccent(${tsQuery}))
      ${projectId ? Prisma.sql`AND t.project_id = ${projectId}::uuid` : Prisma.empty}
      LIMIT 2000`;
    return rows.map((r) => r.id);
  }

  private orderBy(sort: TaskListQuery['sort'], order: 'asc' | 'desc'): Prisma.TaskOrderByWithRelationInput[] {
    const primary: Prisma.TaskOrderByWithRelationInput =
      sort === 'dueDate' ? { dueDate: { sort: order, nulls: 'last' } } : { [sort]: order };
    return [primary, { createdAt: 'desc' }, { id: 'asc' }];
  }
}
