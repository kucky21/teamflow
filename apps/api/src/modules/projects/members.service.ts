import { canManageRole, PROJECT_ROLE_LABELS, type Member, type ProjectRole } from '@teamflow/shared';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { iso } from '../../domain/dates.js';
import type { AccessService } from '../access/access.service.js';
import type { ActivityService } from '../activity/activity.service.js';
import { toUserSummary, userSummarySelect } from '../mappers.js';

export class MemberService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
    private readonly activity: ActivityService,
  ) {}

  async list(projectId: string, userId: string): Promise<Member[]> {
    await this.access.project(projectId, userId, 'project:view', { allowArchived: true });
    const members = await this.db.projectMember.findMany({
      where: { projectId },
      include: { user: { select: userSummarySelect } },
      orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
    });
    return members.map((m) => ({ user: toUserSummary(m.user), role: m.role, joinedAt: iso(m.joinedAt) }));
  }

  async add(projectId: string, actorId: string, input: { userId: string; role: ProjectRole }): Promise<Member> {
    return this.db.$transaction(async (tx) => {
      const { role: actorRole } = await this.access.project(projectId, actorId, 'member:manage', { db: tx });
      if (!canManageRole(actorRole, input.role)) {
        throw forbidden('Nemáte oprávnění přidělit tuto roli.');
      }
      const user = await tx.user.findUnique({ where: { id: input.userId }, select: userSummarySelect });
      if (!user) throw notFound('Uživatel neexistuje.');
      const existing = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: input.userId } },
      });
      if (existing) throw conflict('Uživatel je již členem projektu.', 'ALREADY_MEMBER');

      const member = await tx.projectMember.create({
        data: { projectId, userId: input.userId, role: input.role },
      });
      await this.activity.record(tx, {
        type: 'MEMBER_ADDED',
        projectId,
        actorId,
        meta: { memberName: user.name, role: PROJECT_ROLE_LABELS[input.role] },
      });
      return { user: toUserSummary(user), role: member.role, joinedAt: iso(member.joinedAt) };
    });
  }

  async updateRole(projectId: string, actorId: string, memberId: string, role: ProjectRole): Promise<Member> {
    return this.db.$transaction(async (tx) => {
      const { project, role: actorRole } = await this.access.project(projectId, actorId, 'member:manage', {
        db: tx,
      });
      const member = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: memberId } },
        include: { user: { select: userSummarySelect } },
      });
      if (!member) throw notFound('Uživatel není členem projektu.');
      if (member.userId === project.ownerId) {
        throw conflict('Roli vlastníka projektu nelze změnit.', 'OWNER_ROLE_LOCKED');
      }
      if (!canManageRole(actorRole, member.role) || !canManageRole(actorRole, role)) {
        throw forbidden('Nemáte oprávnění změnit roli tohoto člena.');
      }
      if (member.role === role) {
        return { user: toUserSummary(member.user), role: member.role, joinedAt: iso(member.joinedAt) };
      }
      const updated = await tx.projectMember.update({
        where: { projectId_userId: { projectId, userId: memberId } },
        data: { role },
      });
      await this.activity.record(tx, {
        type: 'MEMBER_ROLE_CHANGED',
        projectId,
        actorId,
        changes: [{ field: 'role', from: PROJECT_ROLE_LABELS[member.role], to: PROJECT_ROLE_LABELS[role] }],
        meta: { memberName: member.user.name },
      });
      return { user: toUserSummary(member.user), role: updated.role, joinedAt: iso(updated.joinedAt) };
    });
  }

  /**
   * Odebrání člena. Člen může projekt opustit sám; jinak je potřeba oprávnění
   * `member:manage` a vyšší role. Úkoly odebraného člena se v transakci uvolní.
   */
  async remove(projectId: string, actorId: string, memberId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const isSelf = actorId === memberId;
      const { project, role: actorRole } = await this.access.project(
        projectId,
        actorId,
        isSelf ? 'project:view' : 'member:manage',
        { db: tx },
      );
      const member = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: memberId } },
        include: { user: { select: userSummarySelect } },
      });
      if (!member) throw notFound('Uživatel není členem projektu.');
      if (member.userId === project.ownerId) {
        throw conflict('Vlastníka projektu nelze odebrat.', 'OWNER_CANNOT_BE_REMOVED');
      }
      if (!isSelf && !canManageRole(actorRole, member.role)) {
        throw forbidden('Nemáte oprávnění odebrat tohoto člena.');
      }

      await tx.task.updateMany({ where: { projectId, assigneeId: memberId }, data: { assigneeId: null } });
      await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId: memberId } } });
      await this.activity.record(tx, {
        type: 'MEMBER_REMOVED',
        projectId,
        actorId,
        meta: { memberName: member.user.name },
      });
    });
  }
}
