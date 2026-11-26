import type { Request, Response } from 'express';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { passwordResetTokens, users, type User } from '../../db/schema.js';
import { AppError, conflict, unauthorized } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/http.js';
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  safeEqual,
  verifyPassword,
} from '../../lib/security.js';
import { addMinutes } from '../../lib/time.js';
import { scanForProfanity } from '../../services/moderation.js';
import { createSession, revokeAllSessions } from '../../services/session.js';
import { toAuthUser, type AuthUser } from '../../types/auth.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MINUTES = 15;
const RESET_THROTTLE_SECONDS = 60;

let dummyHashPromise: Promise<string> | null = null;
const getDummyHash = (): Promise<string> => {
  dummyHashPromise ??= hashPassword('dummy-password-for-timing-only');
  return dummyHashPromise;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeCredential = (value: string): string => value.trim().toLowerCase();

const findUserByLogin = async (login: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.login, normalizeCredential(login))).limit(1);
  return rows[0] ?? null;
};

const findUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return rows[0] ?? null;
};

const findUserByUsername = async (username: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.username, normalizeCredential(username))).limit(1);
  return rows[0] ?? null;
};

const findUserById = async (id: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
};

export interface AuthResult {
  user: AuthUser;
  mustChangePassword: boolean;
}

export const registerUser = async (
  input: {
    username: string;
    login: string;
    email: string;
    password: string;
  },
  req: Request,
  res: Response,
): Promise<AuthResult> => {
  const username = normalizeCredential(input.username);
  const login = normalizeCredential(input.login);
  const email = normalizeEmail(input.email);

  const [existingUsername, existingLogin, existingEmail] = await Promise.all([
    findUserByUsername(username),
    findUserByLogin(login),
    findUserByEmail(email),
  ]);

  const fields: Record<string, string> = {};
  if (existingUsername) fields.username = 'Цей юзернейм уже зайнятий.';
  if (existingLogin) fields.login = 'Цей логін уже зайнятий.';
  if (existingEmail) fields.email = 'Ця пошта вже використовується.';
  if (Object.keys(fields).length > 0) {
    throw conflict('Перевірте юзернейм, логін і пошту.', fields);
  }

  if (scanForProfanity(username).flagged) {
    throw new AppError(422, 'INAPPROPRIATE_USERNAME', 'Юзернейм містить неприпустимі вирази.', {
      fields: { username: 'Оберіть інший юзернейм.' },
    });
  }

  const passwordHash = await hashPassword(input.password);

  let created: User | undefined;
  try {
    [created] = await db
      .insert(users)
      .values({ username, login, email, passwordHash })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Юзернейм, логін або пошта вже зайняті.', {
        username: 'Можливо, зайнято.',
        login: 'Можливо, зайнято.',
        email: 'Можливо, зайнято.',
      });
    }
    throw error;
  }

  if (!created) throw new AppError(500, 'USER_CREATE_FAILED', 'Не вдалося створити акаунт.');

  await createSession(created.id, req, res);
  return { user: toAuthUser(created), mustChangePassword: created.mustChangePassword };
};

export const loginUser = async (
  input: { login: string; password: string },
  req: Request,
  res: Response,
): Promise<AuthResult> => {
  const user = await findUserByLogin(input.login);

  if (!user || user.status === 'DELETED' || user.status === 'BANNED') {
    await verifyPassword(await getDummyHash(), input.password);
    throw unauthorized('Невірний логін або пароль.');
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      429,
      'ACCOUNT_LOCKED',
      `Акаунт тимчасово заблоковано через невдалі спроби. Спробуйте після ${user.lockedUntil.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}.`,
    );
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_LOGINS ? addMinutes(new Date(), LOCK_MINUTES) : null;
    await db
      .update(users)
      .set({
        failedLoginAttempts: attempts >= MAX_FAILED_LOGINS ? 0 : attempts,
        lockedUntil,
      })
      .where(eq(users.id, user.id));
    throw unauthorized('Невірний логін або пароль.');
  }

  const now = new Date();
  const [updated] = await db
    .update(users)
    .set({ lastLoginAt: now, updatedAt: now, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) throw new AppError(500, 'USER_UPDATE_FAILED', 'Не вдалося завершити вхід.');

  await createSession(updated.id, req, res);
  return { user: toAuthUser(updated), mustChangePassword: updated.mustChangePassword };
};

export const requestPasswordReset = async (input: {
  login: string;
  email: string;
}): Promise<{ resetToken: string; expiresInMinutes: number }> => {
  const user = await findUserByLogin(input.login);
  const email = normalizeEmail(input.email);

  // Deliberately generic: do not reveal which part (login or email) is wrong.
  if (
    !user ||
    user.status === 'DELETED' ||
    user.status === 'BANNED' ||
    !safeEqual(user.email, email)
  ) {
    throw new AppError(400, 'RESET_NOT_FOUND', 'Невірний логін або пошта.');
  }

  const [latest] = await db
    .select({ createdAt: passwordResetTokens.createdAt })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.consumedAt)))
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);

  if (latest && Date.now() - latest.createdAt.getTime() < RESET_THROTTLE_SECONDS * 1000) {
    throw new AppError(429, 'RESET_THROTTLED', 'Спробуйте ще раз через хвилину.');
  }

  await db
    .update(passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.consumedAt)));

  const token = generateResetToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: addMinutes(new Date(), RESET_TTL_MINUTES),
  });

  return { resetToken: token, expiresInMinutes: RESET_TTL_MINUTES };
};

export const resetPassword = async (input: {
  token: string;
  newPassword: string;
}): Promise<void> => {
  const tokenHash = hashResetToken(input.token);
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.consumedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!record) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Посилання для відновлення недійсне або прострочене.');
  }

  const passwordHash = await hashPassword(input.newPassword);
  const now = new Date();

  await db.transaction(async (tx) => {
    const consumed = await tx
      .update(passwordResetTokens)
      .set({ consumedAt: now })
      .where(and(eq(passwordResetTokens.id, record.id), isNull(passwordResetTokens.consumedAt)))
      .returning({ userId: passwordResetTokens.userId });

    if (consumed.length === 0) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Токен уже використано.');
    }

    await tx
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, record.userId));
  });

  await revokeAllSessions(record.userId);
};

export const requestEmailChange = async (
  user: AuthUser,
  newEmail: string,
  password: string,
): Promise<AuthUser> => {
  const email = normalizeEmail(newEmail);
  if (email === user.email) {
    throw conflict('Це ваша поточна пошта.', { newEmail: 'Вкажіть іншу пошту.' });
  }

  const fullUser = await findUserById(user.id);
  if (!fullUser) throw unauthorized();

  const valid = await verifyPassword(fullUser.passwordHash, password);
  if (!valid) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Невірний поточний пароль.', {
      fields: { password: 'Невірний пароль.' },
    });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw conflict('Ця пошта вже використовується.', { newEmail: 'Пошта вже зайнята.' });
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    if (!updated) throw new AppError(500, 'USER_UPDATE_FAILED', 'Не вдалося змінити пошту.');
    return toAuthUser(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Ця пошта вже використовується.', { newEmail: 'Пошта вже зайнята.' });
    }
    throw error;
  }
};

export const changePassword = async (
  user: AuthUser,
  input: { currentPassword: string; newPassword: string },
  sessionId: string | undefined,
): Promise<void> => {
  const fullUser = await findUserById(user.id);
  if (!fullUser) throw unauthorized();

  const valid = await verifyPassword(fullUser.passwordHash, input.currentPassword);
  if (!valid) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Невірний поточний пароль.', {
      fields: { currentPassword: 'Невірний пароль.' },
    });
  }

  if (input.currentPassword === input.newPassword) {
    throw new AppError(422, 'SAME_PASSWORD', 'Новий пароль має відрізнятися від поточного.', {
      fields: { newPassword: 'Пароль має відрізнятися.' },
    });
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await revokeAllSessions(user.id, sessionId);
};
