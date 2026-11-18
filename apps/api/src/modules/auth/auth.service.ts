import {
  AVATAR_COLORS,
  type ChangePasswordInput,
  type CurrentUser,
  type LoginInput,
  type RegisterInput,
} from '@teamflow/shared';

import { AppError, conflict, isUniqueViolation, unauthorized } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { toCurrentUser } from '../mappers.js';
import { getDummyHash, hashPassword, verifyPassword } from './password.js';
import type { IssuedSession, SessionService } from './session.service.js';

export interface ClientMeta {
  userAgent?: string | undefined;
  ip?: string | undefined;
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
}
