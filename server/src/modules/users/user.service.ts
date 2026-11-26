import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  favorites,
  media,
  registrations,
  reports,
  sessions,
  users,
  webinars,
} from '../../db/schema.js';
import { AppError, badRequest, notFound, unauthorized } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/security.js';
import { scanForProfanity } from '../../services/moderation.js';
import { toAuthUser, type AuthUser } from '../../types/auth.js';
import type { updateProfileSchema } from './user.schemas.js';
import type { z } from 'zod';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<AuthUser> => {
  const [current] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!current || current.status === 'DELETED') throw unauthorized();

  if (input.displayName && scanForProfanity(input.displayName).flagged) {
    throw new AppError(422, 'INAPPROPRIATE_NAME', 'Ім’я містить неприпустимі вирази.', {
      fields: { displayName: 'Оберіть інше ім’я.' },
    });
  }

  if (input.bio && scanForProfanity(input.bio).flagged) {
    throw new AppError(422, 'INAPPROPRIATE_CONTENT', 'Опис містить неприпустимі вирази.', {
      fields: { bio: 'Змініть опис.' },
    });
  }

  let avatarUrl: string | null | undefined;
  let avatarPreset: string | undefined;

  if (input.avatarMediaId) {
    const [mediaRow] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, input.avatarMediaId), eq(media.ownerId, userId), eq(media.kind, 'AVATAR')))
      .limit(1);
    if (!mediaRow) throw badRequest('Файл аватара не знайдено.', { avatar: 'Завантажте файл ще раз.' });
    avatarUrl = mediaRow.publicUrl;
  } else if (input.avatarPreset) {
    avatarPreset = input.avatarPreset;
    avatarUrl = null;
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(avatarPreset ? { avatarPreset } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw notFound('Користувача не знайдено.');
  return toAuthUser(updated);
};

export const deleteAccount = async (userId: string, password: string): Promise<void> => {
  const [current] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!current || current.status === 'DELETED') throw unauthorized();

  const valid = await verifyPassword(current.passwordHash, password);
  if (!valid) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Невірний пароль.', {
      fields: { password: 'Невірний пароль.' },
    });
  }

  if (current.role === 'ADMIN') {
    const [otherAdmins] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.role, 'ADMIN'),
          eq(users.status, 'ACTIVE'),
          isNull(users.deletedAt),
          ne(users.id, userId),
        ),
      );
    if (Number(otherAdmins?.count ?? 0) === 0) {
      throw new AppError(409, 'LAST_ADMIN', 'Не можна видалити останнього активного адміністратора.');
    }
  }

  await softDeleteUser(userId, 'Користувач видалив акаунт.');
};

export const softDeleteUser = async (userId: string, note: string): Promise<void> => {
  const [current] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!current) throw notFound('Користувача не знайдено.');
  if (current.status === 'DELETED') return;

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(webinars)
      .set({
        deletedAt: now,
        status: 'CANCELLED',
        cancelledAt: now,
        moderationStatus: 'HIDDEN',
        updatedAt: now,
      })
      .where(and(eq(webinars.ownerId, userId), isNull(webinars.deletedAt)));

    await tx
      .update(users)
      .set({
        status: 'DELETED',
        email: `deleted+${userId}@deleted.invalid`,
        passwordHash: '!deleted',
        displayName: 'Видалений користувач',
        bio: null,
        avatarUrl: null,
        avatarPreset: 'avatar-01',
        pendingEmail: null,
        emailVerifiedAt: null,
        mustChangePassword: false,
        lockedUntil: null,
        failedLoginAttempts: 0,
        deletedAt: now,
        updatedAt: now,
        role: 'USER',
      })
      .where(eq(users.id, userId));

    await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

    await tx.delete(favorites).where(eq(favorites.userId, userId));
    await tx.delete(registrations).where(eq(registrations.userId, userId));

    await tx
      .update(reports)
      .set({
        status: 'RESOLVED',
        resolutionNote: note.slice(0, 500),
        resolvedAt: now,
      })
      .where(and(eq(reports.userId, userId), eq(reports.status, 'OPEN')));

    await tx.update(reports).set({ reporterId: null }).where(eq(reports.reporterId, userId));
  });
};
