import type { Request, Response } from 'express';
import { and, desc, eq, gt, inArray, isNull, lt, ne } from 'drizzle-orm';
import { env } from '../env.js';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
import { addDays } from '../lib/time.js';
import { generateSessionToken, hashIp, hashSessionToken } from '../lib/security.js';
import { logger } from '../lib/logger.js';
import type { AuthUser } from '../types/auth.js';
import { toAuthUser } from '../types/auth.js';

const COOKIE_PATH = '/';

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: COOKIE_PATH,
  maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
});

export const sessionTokenFromRequest = (req: Request): string | null => {
  const value = req.cookies?.[env.SESSION_COOKIE_NAME];
  return typeof value === 'string' && value.length > 20 ? value : null;
};

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(env.SESSION_COOKIE_NAME, token, cookieOptions());
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
};

export const createSession = async (userId: string, req: Request, res: Response): Promise<void> => {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = addDays(new Date(), env.SESSION_TTL_DAYS);

  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.createdAt))
    .offset(env.MAX_ACTIVE_SESSIONS - 1);

  if (activeSessions.length > 0) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(inArray(sessions.id, activeSessions.map((session) => session.id)));
  }

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    ipHash: hashIp(req.ip),
    userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
  });

  setSessionCookie(res, token);
};

export interface LoadedSession {
  sessionId: string;
  token: string;
  user: AuthUser;
}

export const loadSession = async (token: string): Promise<LoadedSession | null> => {
  const tokenHash = hashSessionToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        inArray(users.status, ['ACTIVE', 'SHADOW_BANNED']),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
  if (row.session.lastUsedAt < fiveMinutesAgo) {
    db.update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, row.session.id))
      .catch((error: unknown) => logger.warn({ error }, 'session:touch-failed'));
  }

  return {
    sessionId: row.session.id,
    token,
    user: toAuthUser(row.user),
  };
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
};

export const revokeAllSessions = async (userId: string, exceptSessionId?: string): Promise<void> => {
  const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
  if (exceptSessionId) conditions.push(ne(sessions.id, exceptSessionId));
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(...conditions));
};

export const revokeExpiredSessions = async (): Promise<void> => {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(isNull(sessions.revokedAt), lt(sessions.expiresAt, new Date())));
};
