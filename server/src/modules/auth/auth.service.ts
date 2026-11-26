import type { Request, Response } from 'express';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { authCodes, users, type User } from '../../db/schema.js';
import { env, isProduction } from '../../env.js';
import { AppError, conflict, forbidden, notFound, unauthorized } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import {
  generateOtp,
  hashOtp,
  hashPassword,
  safeEqual,
  verifyPassword,
} from '../../lib/security.js';
import { addMinutes } from '../../lib/time.js';
import { scanForProfanity } from '../../services/moderation.js';
import { sendOtpEmail } from '../../services/mail.js';
import { createSession, revokeAllSessions } from '../../services/session.js';
import { toAuthUser, type AuthUser } from '../../types/auth.js';

type OtpPurpose = 'VERIFY_EMAIL' | 'LOGIN' | 'CHANGE_EMAIL';

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

let dummyHashPromise: Promise<string> | null = null;
const getDummyHash = (): Promise<string> => {
  dummyHashPromise ??= hashPassword('dummy-password-for-timing-only');
  return dummyHashPromise;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const findUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return rows[0] ?? null;
};

const findUserById = async (id: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
};

const exposeDevCode = (code: string): string | undefined => {
  return env.EXPOSE_DEV_CODES && !isProduction ? code : undefined;
};

const saveAndSendCode = async (
  user: User,
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> => {
  const codeHash = hashOtp(normalizeEmail(email), purpose, code);

  await db
    .update(authCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authCodes.userId, user.id),
        eq(authCodes.purpose, purpose),
        isNull(authCodes.consumedAt),
      ),
    );

  const [inserted] = await db
    .insert(authCodes)
    .values({
      userId: user.id,
      email: normalizeEmail(email),
      purpose,
      codeHash,
      expiresAt: addMinutes(new Date(), OTP_TTL_MINUTES),
    })
    .returning({ id: authCodes.id });

  if (!inserted) throw new AppError(500, 'CODE_CREATE_FAILED', 'Не вдалося створити код.');

  try {
    await sendOtpEmail(email, code, purpose === 'CHANGE_EMAIL' ? 'CHANGE_EMAIL' : purpose);
  } catch (error) {
    await db.update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, inserted.id));
    throw error;
  }
};

const issueCode = async (
  user: User,
  email: string,
  purpose: OtpPurpose,
): Promise<string | undefined> => {
  const [latest] = await db
    .select({ createdAt: authCodes.createdAt })
    .from(authCodes)
    .where(
      and(
        eq(authCodes.userId, user.id),
        eq(authCodes.purpose, purpose),
        isNull(authCodes.consumedAt),
      ),
    )
    .orderBy(desc(authCodes.createdAt))
    .limit(1);

  if (latest) {
    const secondsSince = Math.floor((Date.now() - latest.createdAt.getTime()) / 1000);
    if (secondsSince < OTP_RESEND_SECONDS) {
      throw new AppError(
        429,
        'OTP_THROTTLED',
        `Код уже надіслано. Повторіть спробу через ${OTP_RESEND_SECONDS - secondsSince} с.`,
        { details: { retryAfter: OTP_RESEND_SECONDS - secondsSince } },
      );
    }
  }

  const code = generateOtp();
  await saveAndSendCode(user, email, purpose, code);
  return exposeDevCode(code);
};

const consumeCode = async (email: string, purpose: OtpPurpose, code: string): Promise<{ userId: string }> => {
  const normalizedEmail = normalizeEmail(email);
  const [record] = await db
    .select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.email, normalizedEmail),
        eq(authCodes.purpose, purpose),
        isNull(authCodes.consumedAt),
      ),
    )
    .orderBy(desc(authCodes.createdAt))
    .limit(1);

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'INVALID_CODE', 'Код недійсний або вже прострочений.');
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await db.update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, record.id));
    throw new AppError(429, 'OTP_ATTEMPTS_EXCEEDED', 'Перевищено кількість спроб. Запросіть новий код.');
  }

  const expected = hashOtp(normalizedEmail, purpose, code);
  if (!safeEqual(expected, record.codeHash)) {
    await db
      .update(authCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(authCodes.id, record.id));
    throw new AppError(400, 'INVALID_CODE', 'Код недійсний або вже прострочений.');
  }

  const consumed = await db
    .update(authCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(authCodes.id, record.id), isNull(authCodes.consumedAt)))
    .returning({ userId: authCodes.userId });

  if (consumed.length === 0) {
    throw new AppError(400, 'INVALID_CODE', 'Код уже використано. Запросіть новий.');
  }

  return { userId: record.userId };
};

export interface AuthResult {
  user: AuthUser;
  mustChangePassword: boolean;
}

export const registerUser = async (input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<{ email: string; requiresVerification: true; devCode?: string }> => {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) {
    throw conflict('Ця електронна пошта вже зареєстрована. Увійдіть або відновіть доступ.', {
      email: 'Пошта вже зайнята.',
    });
  }

  if (scanForProfanity(input.displayName).flagged) {
    throw new AppError(422, 'INAPPROPRIATE_NAME', 'Ім’я містить неприпустимі вирази.', {
      fields: { displayName: 'Оберіть інше ім’я.' },
    });
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName: input.displayName,
      })
      .returning();

    if (!created) throw new AppError(500, 'USER_CREATE_FAILED', 'Не вдалося створити акаунт.');

    const devCode = await issueCode(created, email, 'VERIFY_EMAIL');
    return { email, requiresVerification: true, devCode };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Ця електронна пошта вже зареєстрована.', { email: 'Пошта вже зайнята.' });
    }
    throw error;
  }
};

export const verifyEmail = async (
  input: { email: string; code: string },
  req: Request,
  res: Response,
): Promise<AuthResult> => {
  const { userId } = await consumeCode(input.email, 'VERIFY_EMAIL', input.code);
  const user = await findUserById(userId);
  if (!user) throw notFound('Акаунт не знайдено.');

  const now = new Date();
  const [updated] = await db
    .update(users)
    .set({ emailVerifiedAt: now, lastLoginAt: now, updatedAt: now, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) throw new AppError(500, 'USER_UPDATE_FAILED', 'Не вдалося активувати акаунт.');

  await createSession(updated.id, req, res);
  return { user: toAuthUser(updated), mustChangePassword: updated.mustChangePassword };
};

export const login = async (input: {
  email: string;
  password: string;
}): Promise<{ otpRequired: true; email: string; devCode?: string } | { requiresEmailVerification: true; email: string; devCode?: string }> => {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  if (!user || user.status === 'DELETED' || user.status === 'BANNED') {
    await verifyPassword(await getDummyHash(), input.password);
    throw unauthorized('Невірна пошта або пароль.');
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
    throw unauthorized('Невірна пошта або пароль.');
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id));

  if (!user.emailVerifiedAt) {
    const devCode = await issueCode(user, email, 'VERIFY_EMAIL');
    return { requiresEmailVerification: true, email, devCode };
  }

  const devCode = await issueCode(user, email, 'LOGIN');
  return { otpRequired: true, email, devCode };
};

export const verifyLogin = async (
  input: { email: string; code: string },
  req: Request,
  res: Response,
): Promise<AuthResult> => {
  const { userId } = await consumeCode(input.email, 'LOGIN', input.code);
  const user = await findUserById(userId);
  if (!user) throw notFound('Акаунт не знайдено.');
  if (user.status !== 'ACTIVE' && user.status !== 'SHADOW_BANNED') {
    throw forbidden('Акаунт обмежено. Зверніться до підтримки.');
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

export const resendCode = async (input: {
  email: string;
  purpose: 'VERIFY_EMAIL' | 'LOGIN';
}): Promise<{ sent: true; devCode?: string }> => {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  // Do not reveal whether the account exists.
  if (!user || user.status === 'DELETED' || user.status === 'BANNED') {
    return { sent: true };
  }

  const purpose = input.purpose === 'LOGIN' && !user.emailVerifiedAt ? 'VERIFY_EMAIL' : input.purpose;
  const code = generateOtp();

  try {
    await saveAndSendCode(user, email, purpose, code);
  } catch (error) {
    logger.warn({ error, email }, 'auth:resend-failed');
    throw error;
  }

  return { sent: true, devCode: exposeDevCode(code) };
};

export const requestEmailChange = async (user: AuthUser, newEmail: string, password: string): Promise<{ pendingEmail: string; devCode?: string }> => {
  const email = normalizeEmail(newEmail);
  if (email === user.email) {
    throw conflict('Це ваша поточна пошта.', { email: 'Вкажіть іншу пошту.' });
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

  const now = new Date();
  await db.update(users).set({ pendingEmail: email, updatedAt: now }).where(eq(users.id, user.id));

  const code = generateOtp();
  await saveAndSendCode(fullUser, email, 'CHANGE_EMAIL', code);
  return { pendingEmail: email, devCode: exposeDevCode(code) };
};

export const resendEmailChangeCode = async (
  user: AuthUser,
): Promise<{ sent: true; devCode?: string }> => {
  const fullUser = await findUserById(user.id);
  if (!fullUser || !fullUser.pendingEmail) {
    throw new AppError(400, 'NO_PENDING_EMAIL', 'Немає запиту на зміну пошти.');
  }

  const code = generateOtp();
  await saveAndSendCode(fullUser, fullUser.pendingEmail, 'CHANGE_EMAIL', code);
  return { sent: true, devCode: exposeDevCode(code) };
};

export const confirmEmailChange = async (user: AuthUser, code: string): Promise<AuthUser> => {
  const fullUser = await findUserById(user.id);
  if (!fullUser || !fullUser.pendingEmail) {
    throw new AppError(400, 'NO_PENDING_EMAIL', 'Немає запиту на зміну пошти.');
  }

  const { userId } = await consumeCode(fullUser.pendingEmail, 'CHANGE_EMAIL', code);
  if (userId !== user.id) throw forbidden();

  const existing = await findUserByEmail(fullUser.pendingEmail);
  if (existing && existing.id !== user.id) {
    throw conflict('Ця пошта вже використовується.', { code: 'Пошта вже зайнята.' });
  }

  const now = new Date();
  try {
    const [updated] = await db
      .update(users)
      .set({
        email: fullUser.pendingEmail,
        pendingEmail: null,
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .returning();
    if (!updated) throw new AppError(500, 'USER_UPDATE_FAILED', 'Не вдалося змінити пошту.');
    return toAuthUser(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Ця пошта вже використовується.', { code: 'Пошта вже зайнята.' });
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
