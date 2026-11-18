import { hasProjectPermission, parseTaskKey, type ProjectPermission } from '@teamflow/shared';
import type { Project, ProjectRole } from '../../generated/prisma/client.js';
import { forbidden, notFound, projectArchived } from '../../lib/errors.js';
import type { Db, DbClient } from '../../lib/prisma.js';

export interface AccessOptions {
  /** Klient transakce, pokud kontrola probíhá uvnitř ní. */
  db?: DbClient;
  /** Povolit operaci i nad archivovaným projektem (čtení). */
  allowArchived?: boolean;
}

export interface ProjectAccess {
  project: Project;
  role: ProjectRole;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Centrální kontrola oprávnění. Každá operace nad projektem, úkolem,
 * komentářem nebo štítkem prochází přes tuto službu.
 *
 * Nečlenům vracíme 404 místo 403, aby API neprozrazovalo existenci
 * cizích projektů a úkolů.
 */
export class AccessService {
  constructor(private readonly db: Db) {}

  async project(
    projectId: string,
    userId: string,
    permission: ProjectPermission,
    options: AccessOptions = {},
  ): Promise<ProjectAccess> {
    const db = options.db ?? this.db;
    const membership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { project: true },
    });
    if (!membership) throw notFound('Projekt neexistuje nebo k němu nemáte přístup.');
    if (!hasProjectPermission(membership.role, permission)) throw forbidden();
    if (membership.project.archivedAt && !options.allowArchived) throw projectArchived();
    return { project: membership.project, role: membership.role };
  }

  async task(taskRef: string, userId: string, permission: ProjectPermission, options: AccessOptions = {}) {
    const db = options.db ?? this.db;
    const select = {
      id: true,
      projectId: true,
      number: true,
      title: true,
      status: true,
      creatorId: true,
    } as const;

    let task;
    if (UUID_PATTERN.test(taskRef)) {
      task = await db.task.findUnique({ where: { id: taskRef }, select });
    } else {
      const parsed = parseTaskKey(taskRef);
      task = parsed
        ? await db.task.findFirst({ where: { number: parsed.number, project: { key: parsed.projectKey } }, select })
        : null;
    }
    if (!task) throw notFound('Úkol neexistuje nebo k němu nemáte přístup.');

    try {
      const access = await this.project(task.projectId, userId, permission, options);
      return { task, ...access };
    } catch (error) {
      // Neprozrazujeme, že úkol existuje v cizím projektu.
      if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
        throw notFound('Úkol neexistuje nebo k němu nemáte přístup.');
      }
      throw error;
    }
  }

  /** Ověří, že uživatel je členem projektu (např. před přiřazením úkolu). */
  async assertMember(projectId: string, userId: string, db: DbClient = this.db): Promise<void> {
    const member = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true },
    });
    if (!member) throw forbidden('Úkol lze přiřadit pouze členovi projektu.', 'ASSIGNEE_NOT_MEMBER');
  }
}
