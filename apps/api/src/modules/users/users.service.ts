import type { CurrentUser, UpdateProfileInput, UserSearchQuery, UserSummary } from '@teamflow/shared';

import type { Db } from '../../lib/prisma.js';
import type { AccessService } from '../access/access.service.js';
import { toCurrentUser, toUserSummary, userSummarySelect } from '../mappers.js';

const SEARCH_LIMIT = 20;

export class UserService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
  ) {}

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<CurrentUser> {
    const user = await this.db.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.avatarColor !== undefined ? { avatarColor: input.avatarColor } : {}),
      },
    });
    return toCurrentUser(user);
  }

  /**
   * Vyhledávání uživatelů pro přidání do projektu. S `excludeProjectId` vrací jen ty,
   * kdo v projektu ještě nejsou – a vyžaduje oprávnění spravovat jeho členy.
   */
  async search(userId: string, query: UserSearchQuery): Promise<UserSummary[]> {
    if (query.excludeProjectId) {
      await this.access.project(query.excludeProjectId, userId, 'member:manage');
    }
    const q = query.q?.trim();
    const users = await this.db.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(query.excludeProjectId ? { memberships: { none: { projectId: query.excludeProjectId } } } : {}),
      },
      select: userSummarySelect,
      orderBy: { name: 'asc' },
      take: SEARCH_LIMIT,
    });
    return users.map(toUserSummary);
  }
}
