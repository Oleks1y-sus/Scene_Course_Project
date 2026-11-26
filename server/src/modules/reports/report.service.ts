import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { auditLogs, reports, users, webinars } from '../../db/schema.js';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/http.js';
import type { AuthUser } from '../../types/auth.js';
import type { CreateReportInput } from './report.schemas.js';

const WEBINAR_REASONS = new Set([
  'SPAM',
  'INAPPROPRIATE_CONTENT',
  'MISLEADING',
  'HARASSMENT',
  'COPYRIGHT',
  'OTHER',
]);

const USER_REASONS = new Set([
  'INAPPROPRIATE_NAME',
  'INAPPROPRIATE_AVATAR',
  'HARASSMENT',
  'SPAM',
  'IMPERSONATION',
  'OTHER',
]);

const AUTO_HIDE_THRESHOLD = 3;

const writeAudit = async (action: string, targetType: string, targetId: string, note: string) => {
  await db.insert(auditLogs).values({ adminId: null, action, targetType, targetId, note });
};

export const createReport = async (
  reporter: AuthUser,
  input: CreateReportInput,
): Promise<{ id: string; message: string }> => {
  let reportId: string;

  if (input.targetType === 'WEBINAR') {
    if (!WEBINAR_REASONS.has(input.reason)) {
      throw conflict('Ця причина не застосовується до заходу.');
    }

    const [webinar] = await db
      .select({ id: webinars.id, ownerId: webinars.ownerId, moderationStatus: webinars.moderationStatus })
      .from(webinars)
      .where(and(eq(webinars.id, input.targetId), isNull(webinars.deletedAt)))
      .limit(1);

    if (!webinar) throw notFound('Захід не знайдено.');
    if (webinar.ownerId === reporter.id) throw forbidden('Не можна скаржитися на власний захід.');

    try {
      const [created] = await db
        .insert(reports)
        .values({
          reporterId: reporter.id,
          targetType: 'WEBINAR',
          webinarId: webinar.id,
          reason: input.reason,
          details: input.details ?? null,
        })
        .returning({ id: reports.id });
      if (!created) throw new Error('Report insert failed.');
      reportId = created.id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict('Ви вже надіслали скаргу на цей захід. Вона очікує розгляду.');
      }
      throw error;
    }

    const [openReports] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(and(eq(reports.webinarId, webinar.id), eq(reports.status, 'OPEN')));

    if (Number(openReports?.count ?? 0) >= AUTO_HIDE_THRESHOLD && webinar.moderationStatus === 'VISIBLE') {
      await db
        .update(webinars)
        .set({
          moderationStatus: 'PENDING',
          moderationNote: 'Автоматично приховано після кількох скарг користувачів. Очікує рішення адміністратора.',
          updatedAt: new Date(),
        })
        .where(eq(webinars.id, webinar.id));
      await writeAudit(
        'AUTO_HIDE_WEBINAR',
        'WEBINAR',
        webinar.id,
        `Автоматичне приховування: ${AUTO_HIDE_THRESHOLD}+ відкритих скарг.`,
      );
    }

    return { id: reportId, message: 'Дякуємо. Скаргу надіслано на розгляд адміністратору.' };
  }

  if (!USER_REASONS.has(input.reason)) {
    throw conflict('Ця причина не застосовується до користувача.');
  }

  const [target] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(and(eq(users.id, input.targetId), isNull(users.deletedAt)))
    .limit(1);

  if (!target) throw notFound('Користувача не знайдено.');
  if (target.id === reporter.id) throw forbidden('Не можна скаржитися на себе.');

  try {
    const [created] = await db
      .insert(reports)
      .values({
        reporterId: reporter.id,
        targetType: 'USER',
        userId: target.id,
        reason: input.reason,
        details: input.details ?? null,
      })
      .returning({ id: reports.id });
    if (!created) throw new Error('Report insert failed.');
    reportId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Ви вже надіслали скаргу на цього користувача. Вона очікує розгляду.');
    }
    throw error;
  }

  return { id: reportId, message: 'Дякуємо. Скаргу надіслано на розгляд адміністратору.' };
};
