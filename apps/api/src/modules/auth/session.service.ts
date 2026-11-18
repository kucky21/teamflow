import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../../config/env.js';
import type { Db, DbClient } from '../../lib/prisma.js';
import { userSummarySelect } from '../mappers.js';

export const SESSION_COOKIE = 'tf_session';
export const CSRF_COOKIE = 'tf_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Jak často se session prodlužuje (klouzavá expirace) – omezuje zápisy do DB. */
const RENEW_AFTER_MS = 60 * 60 * 1000;

export interface IssuedSession {
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

export interface ResolvedSession {
  sessionId: string;
  csrfToken: string;
  expiresAt: Date;
  renewed: boolean;
  user: { id: string; name: string; email: string; avatarColor: string; createdAt: Date };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export class SessionService {
  constructor(
    private readonly db: Db,
    private readonly config: AppConfig,
  ) {}

  async create(
    userId: string,
    meta: { userAgent?: string | undefined; ip?: string | undefined },
    db: DbClient = this.db,
  ): Promise<IssuedSession> {
    const token = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(Date.now() + this.config.sessionTtlMs);
    await db.session.create({
      data: {
        tokenHash: hashToken(token),
        csrfToken,
        userId,
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
        ip: meta.ip ?? null,
      },
    });
    return { token, csrfToken, expiresAt };
  }

  async resolve(token: string): Promise<ResolvedSession | null> {
    if (token.length < 20 || token.length > 100) return null;
    const session = await this.db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { ...userSummarySelect, createdAt: true } } },
    });
    if (!session) return null;

    const now = Date.now();
    if (session.expiresAt.getTime() <= now) {
      await this.db.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    let expiresAt = session.expiresAt;
    let renewed = false;
    if (now - session.lastUsedAt.getTime() > RENEW_AFTER_MS) {
      expiresAt = new Date(now + this.config.sessionTtlMs);
      await this.db.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(now), expiresAt },
      });
      renewed = true;
    }

    return { sessionId: session.id, csrfToken: session.csrfToken, expiresAt, renewed, user: session.user };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.session.deleteMany({ where: { id: sessionId } });
  }

  async revokeOthers(userId: string, keepSessionId: string, db: DbClient = this.db): Promise<void> {
    await db.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
  }

  /** Úklid prošlých session (volá se periodicky ze serveru). */
  async purgeExpired(): Promise<number> {
    const { count } = await this.db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return count;
  }
}
