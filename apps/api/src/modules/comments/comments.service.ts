import { canDeleteComment, formatTaskKey, type Comment } from '@teamflow/shared';
import { forbidden, notFound } from '../../lib/errors.js';
import type { Db, DbClient } from '../../lib/prisma.js';
import type { AccessService } from '../access/access.service.js';
import type { ActivityService } from '../activity/activity.service.js';
import { commentInclude, toCommentDto } from '../mappers.js';

const EXCERPT_LENGTH = 140;

function excerpt(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH - 1)}…` : flat;
}

export class CommentService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
    private readonly activity: ActivityService,
  ) {}

  async list(taskRef: string, userId: string): Promise<Comment[]> {
    const { task } = await this.access.task(taskRef, userId, 'project:view', { allowArchived: true });
    const rows = await this.db.taskComment.findMany({
      where: { taskId: task.id },
      include: commentInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toCommentDto);
  }

  async create(taskRef: string, userId: string, body: string): Promise<Comment> {
    return this.db.$transaction(async (tx) => {
      const { task, project } = await this.access.task(taskRef, userId, 'comment:create', { db: tx });
      const comment = await tx.taskComment.create({
        data: { taskId: task.id, authorId: userId, body },
        include: commentInclude,
      });
      // Komentář je aktivita na úkolu – posuneme `updatedAt`, aby se úkol řadil mezi nedávno změněné.
      await tx.task.update({ where: { id: task.id }, data: { updatedAt: new Date() } });
      await this.activity.record(tx, {
        type: 'COMMENT_ADDED',
        projectId: project.id,
        actorId: userId,
        taskId: task.id,
        task: { key: formatTaskKey(project.key, task.number), title: task.title },
        meta: { excerpt: excerpt(body) },
      });
      return toCommentDto(comment);
    });
  }

  /** Upravit komentář smí pouze jeho autor. */
  async update(commentId: string, userId: string, body: string): Promise<Comment> {
    return this.db.$transaction(async (tx) => {
      const comment = await this.load(tx, commentId);
      await this.access.task(comment.taskId, userId, 'comment:create', { db: tx });
      if (comment.authorId !== userId) throw forbidden('Upravit lze pouze vlastní komentář.');
      const updated = await tx.taskComment.update({
        where: { id: commentId },
        data: { body },
        include: commentInclude,
      });
      return toCommentDto(updated);
    });
  }

  async remove(commentId: string, userId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const comment = await this.load(tx, commentId);
      const { task, project, role } = await this.access.task(comment.taskId, userId, 'project:view', { db: tx });
      if (!canDeleteComment(role, comment.authorId === userId)) {
        throw forbidden('Smazat lze pouze vlastní komentář.');
      }
      await tx.taskComment.delete({ where: { id: commentId } });
      await this.activity.record(tx, {
        type: 'COMMENT_DELETED',
        projectId: project.id,
        actorId: userId,
        taskId: task.id,
        task: { key: formatTaskKey(project.key, task.number), title: task.title },
      });
    });
  }

  private async load(db: DbClient, commentId: string) {
    const comment = await db.taskComment.findUnique({
      where: { id: commentId },
      select: { id: true, taskId: true, authorId: true },
    });
    if (!comment) throw notFound('Komentář neexistuje.');
    return comment;
  }
}
