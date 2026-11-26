import { and, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/client.js';
import {
  auditLogs,
  favorites,
  registrations,
  reports,
  sessions,
  users,
  webinars,
  type Report,
  type User,
} from '../../db/schema.js';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
} from '../../lib/errors.js';
import { buildMeta, isUniqueViolation } from '../../lib/http.js';
import {
  generateTemporaryPassword,
  hashPassword,
} from '../../lib/security.js';
import { revokeAllSessions } from '../../services/session.js';
import { toAuthUser, type AuthUser } from '../../types/auth.js';
import { listWebinars, getWebinarForViewer, deleteWebinar } from '../webinars/webinar.service.js';
import { softDeleteUser } from '../users/user.service.js';
import type {
  adminReportQuerySchema,
  adminUserQuerySchema,
  adminWebinarQuerySchema,
  createAdminSchema,
  resolveReportSchema,
} from './admin.schemas.js';
import type { z } from 'zod';

type ReportQuery = z.infer<typeof adminReportQuerySchema>;
type UserQuery = z.infer<typeof adminUserQuerySchema>;
type WebinarQuery = z.infer<typeof adminWebinarQuerySchema>;
type ResolveInput = z.infer<typeof resolveReportSchema>;
type CreateAdminInput = z.infer<typeof createAdminSchema>;

const writeAudit = async (
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  note?: string,
): Promise<void> => {
  await db.insert(auditLogs).values({
    adminId,
    action,
    targetType,
    targetId,
    note: note?.slice(0, 500) ?? null,
  });
};

const ensureAnotherAdmin = async (excludedId: string): Promise<void> => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.role, 'ADMIN'),
        eq(users.status, 'ACTIVE'),
        isNull(users.deletedAt),
        ne(users.id, excludedId),
      ),
    );
  if (Number(row?.count ?? 0) === 0) {
    throw conflict('Не можна залишити систему без жодного активного адміністратора.');
  }
};

export const getAdminStats = async () => {
  const [userStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`(count(*) filter (where ${users.status} = 'ACTIVE'))::int`,
      shadowBanned: sql<number>`(count(*) filter (where ${users.status} = 'SHADOW_BANNED'))::int`,
      banned: sql<number>`(count(*) filter (where ${users.status} = 'BANNED'))::int`,
    })
    .from(users)
    .where(ne(users.status, 'DELETED'));

  const [webinarStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      live: sql<number>`(count(*) filter (where ${webinars.status} = 'LIVE'))::int`,
      pending: sql<number>`(count(*) filter (where ${webinars.moderationStatus} = 'PENDING'))::int`,
      hidden: sql<number>`(count(*) filter (where ${webinars.moderationStatus} = 'HIDDEN'))::int`,
    })
    .from(webinars)
    .where(isNull(webinars.deletedAt));

  const [reportStats] = await db
    .select({
      open: sql<number>`(count(*) filter (where ${reports.status} = 'OPEN'))::int`,
      resolved: sql<number>`(count(*) filter (where ${reports.status} = 'RESOLVED'))::int`,
    })
    .from(reports);

  const [favoriteStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(favorites);

  const [registrationStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(registrations)
    .where(inArray(registrations.status, ['REGISTERED', 'ATTENDED']));

  return {
    users: {
      total: Number(userStats?.total ?? 0),
      active: Number(userStats?.active ?? 0),
      shadowBanned: Number(userStats?.shadowBanned ?? 0),
      banned: Number(userStats?.banned ?? 0),
    },
    webinars: {
      total: Number(webinarStats?.total ?? 0),
      live: Number(webinarStats?.live ?? 0),
      pending: Number(webinarStats?.pending ?? 0),
      hidden: Number(webinarStats?.hidden ?? 0),
    },
    reports: {
      open: Number(reportStats?.open ?? 0),
      resolved: Number(reportStats?.resolved ?? 0),
    },
    favorites: Number(favoriteStats?.total ?? 0),
    registrations: Number(registrationStats?.total ?? 0),
  };
};

export const listReports = async (query: ReportQuery) => {
  const conditions = [];
  if (query.status !== 'all') conditions.push(eq(reports.status, query.status));
  if (query.targetType) conditions.push(eq(reports.targetType, query.targetType));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const reporter = alias(users, 'report_reporter');
  const targetUser = alias(users, 'report_target_user');
  const webinarOwner = alias(users, 'report_webinar_owner');
  const resolver = alias(users, 'report_resolver');

  const rows = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      isAutomated: reports.isAutomated,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      reporterId: reports.reporterId,
      reporterUsername: reporter.username,
      webinarId: reports.webinarId,
      webinarTitle: webinars.title,
      webinarStatus: webinars.status,
      webinarModeration: webinars.moderationStatus,
      webinarOwnerId: webinars.ownerId,
      webinarOwnerUsername: webinarOwner.username,
      targetUserId: reports.userId,
      targetUsername: targetUser.username,
      targetUserStatus: targetUser.status,
      resolverUsername: resolver.username,
    })
    .from(reports)
    .leftJoin(reporter, eq(reports.reporterId, reporter.id))
    .leftJoin(webinars, eq(reports.webinarId, webinars.id))
    .leftJoin(webinarOwner, eq(webinars.ownerId, webinarOwner.id))
    .leftJoin(targetUser, eq(reports.userId, targetUser.id))
    .leftJoin(resolver, eq(reports.resolvedBy, resolver.id))
    .where(where)
    .orderBy(desc(reports.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(reports)
    .where(where);

  return {
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    })),
    meta: buildMeta({ page: query.page, limit: query.limit, offset: 0 }, Number(countRow?.total ?? 0)),
  };
};

const ACTION_NOTES: Record<ResolveInput['action'], string> = {
  HIDE_WEBINAR: 'Захід приховано рішенням адміністратора.',
  RESTORE_WEBINAR: 'Захід відновлено після перевірки.',
  SHADOW_BAN_USER: 'Користувача переведено в тіньовий бан.',
  BAN_USER: 'Користувача заблоковано.',
  ACTIVATE_USER: 'Користувача розблоковано.',
  DISMISS: 'Скаргу відхилено після перевірки.',
};

export const resolveReport = async (
  reportId: string,
  admin: AuthUser,
  input: ResolveInput,
): Promise<{ id: string; status: Report['status'] }> => {
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!report) throw notFound('Скаргу не знайдено.');
  if (report.status !== 'OPEN') throw conflict('Цю скаргу вже розглянуто.');

  const webinarAction = input.action === 'HIDE_WEBINAR' || input.action === 'RESTORE_WEBINAR';
  const userAction = ['SHADOW_BAN_USER', 'BAN_USER', 'ACTIVATE_USER'].includes(input.action);

  if (webinarAction && (report.targetType !== 'WEBINAR' || !report.webinarId)) {
    throw badRequest('Ця дія застосовується лише до скарг на заходи.');
  }
  if (userAction && (report.targetType !== 'USER' || !report.userId)) {
    throw badRequest('Ця дія застосовується лише до скарг на користувачів.');
  }

  const now = new Date();
  const note = (input.note?.trim() || ACTION_NOTES[input.action]).slice(0, 500);
  const reportStatus: Report['status'] = input.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';

  await db.transaction(async (tx) => {
    if (input.action === 'HIDE_WEBINAR' && report.webinarId) {
      await tx
        .update(webinars)
        .set({ moderationStatus: 'HIDDEN', moderationNote: note, updatedAt: now })
        .where(eq(webinars.id, report.webinarId));
    }

    if (input.action === 'RESTORE_WEBINAR' && report.webinarId) {
      await tx
        .update(webinars)
        .set({ moderationStatus: 'VISIBLE', moderationNote: null, updatedAt: now })
        .where(eq(webinars.id, report.webinarId));
    }

    if (userAction && report.userId) {
      const [target] = await tx.select().from(users).where(eq(users.id, report.userId)).limit(1);
      if (!target) throw notFound('Користувача не знайдено.');

      if (target.role === 'ADMIN' && input.action !== 'ACTIVATE_USER') {
        await ensureAnotherAdmin(target.id);
      }

      const status =
        input.action === 'SHADOW_BAN_USER'
          ? 'SHADOW_BANNED'
          : input.action === 'BAN_USER'
            ? 'BANNED'
            : 'ACTIVE';

      await tx
        .update(users)
        .set({
          status,
          updatedAt: now,
          ...(status === 'ACTIVE' ? { lockedUntil: null, failedLoginAttempts: 0 } : {}),
        })
        .where(eq(users.id, target.id));

      if (status === 'BANNED') {
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.userId, target.id), isNull(sessions.revokedAt)));
      }
    }

    await tx
      .update(reports)
      .set({
        status: reportStatus,
        resolutionNote: note,
        resolvedBy: admin.id,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(reports.id, reportId));

    await tx.insert(auditLogs).values({
      adminId: admin.id,
      action: `REPORT_${input.action}`,
      targetType: report.targetType,
      targetId: report.webinarId ?? report.userId,
      note,
    });
  });

  return { id: reportId, status: reportStatus };
};

export const listAdminWebinars = async (query: WebinarQuery, admin: AuthUser) => {
  return listWebinars({
    viewer: admin,
    admin: true,
    scope: query.scope,
    sort: query.sort,
    q: query.q,
    moderation: query.moderation,
    page: query.page,
    limit: query.limit,
  });
};

export const updateAdminWebinar = async (
  id: string,
  admin: AuthUser,
  input: { moderationStatus?: 'VISIBLE' | 'PENDING' | 'HIDDEN'; note?: string },
) => {
  const [current] = await db.select().from(webinars).where(and(eq(webinars.id, id), isNull(webinars.deletedAt))).limit(1);
  if (!current) throw notFound('Захід не знайдено.');

  const note =
    input.moderationStatus === 'VISIBLE'
      ? null
      : (input.note?.trim() || current.moderationNote || 'Рішення адміністратора.').slice(0, 280);

  await db
    .update(webinars)
    .set({
      ...(input.moderationStatus ? { moderationStatus: input.moderationStatus } : {}),
      moderationNote: note,
      updatedAt: new Date(),
    })
    .where(eq(webinars.id, id));

  await writeAudit(
    admin.id,
    'WEBINAR_MODERATION',
    'WEBINAR',
    id,
    `Статус модерації: ${input.moderationStatus ?? current.moderationStatus}`,
  );

  return getWebinarForViewer(id, admin);
};

export const deleteAdminWebinar = async (id: string, admin: AuthUser): Promise<void> => {
  await deleteWebinar(id, admin);
  await writeAudit(admin.id, 'WEBINAR_DELETE', 'WEBINAR', id, 'Захід видалено адміністратором.');
};

export const listAdminUsers = async (query: UserQuery) => {
  const conditions = [];
  if (query.status) {
    conditions.push(eq(users.status, query.status));
  } else {
    conditions.push(ne(users.status, 'DELETED'));
  }
  if (query.role) conditions.push(eq(users.role, query.role));
  if (query.q) {
    const escaped = query.q.replace(/[\\%_]/g, '\\$&');
    const search = ilike(users.username, `%${escaped}%`);
    conditions.push(search);
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
      avatarUrl: sql<string>`coalesce(${users.avatarUrl}, '/img/avatars/' || ${users.avatarPreset} || '.svg')`,
      webinarCount: sql<number>`(select count(*)::int from webinars w where w.owner_id = ${users.id} and w.deleted_at is null)`,
      openReports: sql<number>`(select count(*)::int from reports r where r.user_id = ${users.id} and r.status = 'OPEN')`,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(users).where(where);

  return {
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    meta: buildMeta({ page: query.page, limit: query.limit, offset: 0 }, Number(countRow?.total ?? 0)),
  };
};

export const updateAdminUser = async (
  id: string,
  admin: AuthUser,
  input: { role?: 'USER' | 'ADMIN'; status?: User['status']; note?: string },
) => {
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) throw notFound('Користувача не знайдено.');
  if (target.status === 'DELETED') throw conflict('Видаленого користувача не можна змінити.');
  if (target.id === admin.id) throw forbidden('Не можна змінювати власну роль або статус.');

  const removingAdmin =
    target.role === 'ADMIN' &&
    (input.role === 'USER' ||
      (input.status !== undefined && input.status !== 'ACTIVE'));
  if (removingAdmin) await ensureAnotherAdmin(target.id);

  if (input.status === 'DELETED') {
    await softDeleteUser(target.id, input.note ?? 'Акаунт видалено адміністратором.');
    await writeAudit(admin.id, 'USER_DELETE', 'USER', target.id, input.note ?? 'Акаунт видалено.');
    return { id: target.id, deleted: true };
  }

  const now = new Date();
  const [updated] = await db
    .update(users)
    .set({
      ...(input.role ? { role: input.role } : {}),
      ...(input.status
        ? {
            status: input.status,
            ...(input.status === 'ACTIVE'
              ? { lockedUntil: null, failedLoginAttempts: 0 }
              : {}),
          }
        : {}),
      updatedAt: now,
    })
    .where(eq(users.id, target.id))
    .returning();

  if (!updated) throw notFound('Користувача не знайдено.');

  if (updated.status === 'BANNED') {
    await revokeAllSessions(updated.id);
  }

  await writeAudit(
    admin.id,
    'USER_UPDATE',
    'USER',
    updated.id,
    `@${updated.username}: роль ${updated.role}; статус ${updated.status}. ${input.note ?? ''}`.trim(),
  );

  return { id: updated.id, role: updated.role, status: updated.status, deleted: false };
};

export const deleteAdminUser = async (id: string, admin: AuthUser): Promise<void> => {
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) throw notFound('Користувача не знайдено.');
  if (target.status === 'DELETED') return;
  if (target.id === admin.id) throw forbidden('Не можна видалити власний акаунт через адмінпанель.');
  if (target.role === 'ADMIN') await ensureAnotherAdmin(target.id);

  await softDeleteUser(target.id, 'Акаунт видалено адміністратором.');
  await writeAudit(admin.id, 'USER_DELETE', 'USER', target.id, 'Акаунт видалено адміністратором.');
};

export const createAdminAccount = async (
  admin: AuthUser,
  input: CreateAdminInput,
): Promise<{ user: AuthUser; temporaryPassword: string }> => {
  const existing = await db
    .select({ username: users.username, login: users.login, email: users.email })
    .from(users)
    .where(or(eq(users.username, input.username), eq(users.login, input.login), eq(users.email, input.email)))
    .limit(1);

  const [existingUser] = existing;
  if (existingUser) {
    const fields: Record<string, string> = {};
    if (existingUser.username === input.username) fields.username = 'Юзернейм уже зайнятий.';
    if (existingUser.login === input.login) fields.login = 'Логін уже зайнятий.';
    if (existingUser.email === input.email) fields.email = 'Пошта вже зайнята.';
    throw conflict('Перевірте юзернейм, логін і пошту.', fields);
  }

  const temporaryPassword = input.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  let created: User | undefined;
  try {
    [created] = await db
      .insert(users)
      .values({
        username: input.username,
        login: input.login,
        email: input.email,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        mustChangePassword: true,
      })
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

  if (!created) throw new Error('Failed to create administrator.');

  await writeAudit(
    admin.id,
    'ADMIN_CREATE',
    'USER',
    created.id,
    `Створено адміністратора @${created.username}.`,
  );

  return { user: toAuthUser(created), temporaryPassword };
};

export const listAudit = async (page: number, limit: number) => {
  const adminUser = alias(users, 'audit_admin');
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      note: auditLogs.note,
      createdAt: auditLogs.createdAt,
      adminUsername: adminUser.username,
    })
    .from(auditLogs)
    .leftJoin(adminUser, eq(auditLogs.adminId, adminUser.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(auditLogs);

  return {
    items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    meta: buildMeta({ page, limit, offset: 0 }, Number(countRow?.total ?? 0)),
  };
};
