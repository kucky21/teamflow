import {
  AVATAR_COLORS,
  type ChangePasswordInput,
  type CurrentUser,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
  type UserSummary,
} from '@teamflow/shared';
import { AppError, conflict, isUniqueViolation, unauthorized } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { iso } from '../../domain/dates.js';
import type { AccessService } from '../access/access.service.js';
import { toUserSummary, userSummarySelect } from '../mappers.js';
import { getDummyHash, hashPassword, verifyPassword } from './password.js';
import type { IssuedSession, SessionService } from './session.service.js';

interface ClientMeta {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export function toCurrentUser(u: { id: string; name: string; email: string; avatarColor: string; createdAt: Date }) {
  return { ...toUserSummary(u), createdAt: iso(u.createdAt) } satisfies CurrentUser;
}

function pickAvatarColor(email: string): string {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly sessions: SessionService,
    private readonly access: AccessService,
  ) {}

  async register(input: RegisterInput, meta: ClientMeta): Promise<{ user: CurrentUser; session: IssuedSession }> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash,
            avatarColor: pickAvatarColor(input.email),
          },
        });
        const session = await this.sessions.create(user.id, meta, tx);
        return { user: toCurrentUser(user), session };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict('Účet s tímto e-mailem již existuje.', 'EMAIL_TAKEN');
      }
      throw error;
    }
  }

  async login(input: LoginInput, meta: ClientMeta): Promise<{ user: CurrentUser; session: IssuedSession }> {
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    // Ověření proběhne vždy, aby se doba odpovědi nelišila pro neexistující účet.
    const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password);
    if (!user || !valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Nesprávný e-mail nebo heslo.');
    }
    const session = await this.sessions.create(user.id, meta);
    return { user: toCurrentUser(user), session };
  }

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

  /** Změna hesla zneplatní všechny ostatní přihlášené relace uživatele. */
  async changePassword(userId: string, sessionId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Současné heslo není správné.', [
        { path: 'currentPassword', message: 'Současné heslo není správné.' },
      ]);
    }
    const passwordHash = await hashPassword(input.newPassword);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await this.sessions.revokeOthers(userId, sessionId, tx);
    });
  }

  /** Vyhledávání uživatelů pro přidání do projektu. */
  async searchUsers(userId: string, query: { q?: string | undefined; excludeProjectId?: string | undefined }) {
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
      take: 20,
    });
    return users.map((u): UserSummary => toUserSummary(u));
  }
}
