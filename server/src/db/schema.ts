import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export const USER_STATUSES = ['ACTIVE', 'SHADOW_BANNED', 'BANNED', 'DELETED'] as const;
export const WEBINAR_CATEGORIES = [
  'TECHNOLOGY',
  'MARKETING',
  'DESIGN',
  'BUSINESS',
  'EDUCATION',
  'HEALTH',
  'CREATIVE',
  'OTHER',
] as const;
export const WEBINAR_STATUSES = ['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED'] as const;
export const MODERATION_STATUSES = ['VISIBLE', 'PENDING', 'HIDDEN'] as const;
export const REGISTRATION_STATUSES = ['REGISTERED', 'ATTENDED', 'CANCELLED'] as const;
export const REPORT_TARGETS = ['WEBINAR', 'USER'] as const;
export const REPORT_REASONS = [
  'SPAM',
  'INAPPROPRIATE_CONTENT',
  'INAPPROPRIATE_NAME',
  'INAPPROPRIATE_AVATAR',
  'MISLEADING',
  'HARASSMENT',
  'COPYRIGHT',
  'IMPERSONATION',
  'OTHER',
] as const;
export const REPORT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export const AUTH_CODE_PURPOSES = ['VERIFY_EMAIL', 'LOGIN', 'CHANGE_EMAIL', 'ADMIN_INVITE'] as const;
export const MEDIA_KINDS = ['AVATAR', 'COVER'] as const;

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const userStatusEnum = pgEnum('user_status', USER_STATUSES);
export const webinarCategoryEnum = pgEnum('webinar_category', WEBINAR_CATEGORIES);
export const webinarStatusEnum = pgEnum('webinar_status', WEBINAR_STATUSES);
export const moderationStatusEnum = pgEnum('moderation_status', MODERATION_STATUSES);
export const registrationStatusEnum = pgEnum('registration_status', REGISTRATION_STATUSES);
export const reportTargetEnum = pgEnum('report_target', REPORT_TARGETS);
export const reportReasonEnum = pgEnum('report_reason', REPORT_REASONS);
export const reportStatusEnum = pgEnum('report_status', REPORT_STATUSES);
export const authCodePurposeEnum = pgEnum('auth_code_purpose', AUTH_CODE_PURPOSES);
export const mediaKindEnum = pgEnum('media_kind', MEDIA_KINDS);

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type WebinarCategory = (typeof WEBINAR_CATEGORIES)[number];
export type WebinarStatus = (typeof WEBINAR_STATUSES)[number];
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type AuthCodePurpose = (typeof AUTH_CODE_PURPOSES)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 254 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 60 }).notNull(),
    bio: varchar('bio', { length: 280 }),
    avatarPreset: varchar('avatar_preset', { length: 20 }).notNull().default('avatar-01'),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('USER'),
    status: userStatusEnum('status').notNull().default('ACTIVE'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
    pendingEmail: varchar('pending_email', { length: 254 }),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'date' }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    index('users_role_idx').on(table.role),
    index('users_status_idx').on(table.status),
    index('users_created_at_idx').on(table.createdAt),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    ipHash: varchar('ip_hash', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_unique').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
    index('sessions_expires_idx').on(table.expiresAt),
  ],
);

export const authCodes = pgTable(
  'auth_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 254 }).notNull(),
    purpose: authCodePurposeEnum('purpose').notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('auth_codes_lookup_idx').on(table.email, table.purpose, table.createdAt),
    index('auth_codes_user_idx').on(table.userId),
  ],
);

export const webinars = pgTable(
  'webinars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    description: text('description').notNull(),
    category: webinarCategoryEnum('category').notNull().default('OTHER'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    coverPreset: varchar('cover_preset', { length: 20 }).notNull().default('cover-01'),
    coverUrl: text('cover_url'),
    status: webinarStatusEnum('status').notNull().default('UPCOMING'),
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('VISIBLE'),
    moderationNote: varchar('moderation_note', { length: 280 }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    capacity: integer('capacity').notNull().default(100),
    isPrivate: boolean('is_private').notNull().default(false),
    language: varchar('language', { length: 8 }).notNull().default('uk'),
    liveStartedAt: timestamp('live_started_at', { withTimezone: true, mode: 'date' }),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('webinars_slug_unique').on(table.slug),
    index('webinars_owner_idx').on(table.ownerId),
    index('webinars_starts_idx').on(table.startsAt),
    index('webinars_status_idx').on(table.status),
    index('webinars_moderation_idx').on(table.moderationStatus),
    index('webinars_category_idx').on(table.category),
    check('webinars_duration_check', sql`${table.durationMinutes} BETWEEN 15 AND 480`),
    check('webinars_capacity_check', sql`${table.capacity} BETWEEN 1 AND 10000`),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    webinarId: uuid('webinar_id')
      .notNull()
      .references(() => webinars.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('favorites_user_webinar_unique').on(table.userId, table.webinarId),
    index('favorites_webinar_idx').on(table.webinarId),
  ],
);

export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    webinarId: uuid('webinar_id')
      .notNull()
      .references(() => webinars.id, { onDelete: 'cascade' }),
    status: registrationStatusEnum('status').notNull().default('REGISTERED'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('registrations_user_webinar_unique').on(table.userId, table.webinarId),
    index('registrations_webinar_idx').on(table.webinarId),
    index('registrations_user_idx').on(table.userId),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: reportTargetEnum('target_type').notNull(),
    webinarId: uuid('webinar_id').references(() => webinars.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    reason: reportReasonEnum('reason').notNull(),
    details: varchar('details', { length: 1000 }),
    status: reportStatusEnum('status').notNull().default('OPEN'),
    isAutomated: boolean('is_automated').notNull().default(false),
    resolutionNote: varchar('resolution_note', { length: 500 }),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('reports_status_idx').on(table.status),
    index('reports_target_idx').on(table.targetType),
    index('reports_webinar_idx').on(table.webinarId),
    index('reports_user_idx').on(table.userId),
    uniqueIndex('reports_open_unique')
      .on(table.reporterId, table.targetType, sql`coalesce(${table.webinarId}, ${table.userId})`)
      .where(sql`${table.status} = 'OPEN' AND ${table.reporterId} IS NOT NULL`),
    check(
      'reports_target_check',
      sql`(${table.targetType} = 'WEBINAR' AND ${table.webinarId} IS NOT NULL AND ${table.userId} IS NULL)
          OR (${table.targetType} = 'USER' AND ${table.userId} IS NOT NULL AND ${table.webinarId} IS NULL)`,
    ),
  ],
);

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mediaKindEnum('kind').notNull(),
    storageKey: varchar('storage_key', { length: 255 }),
    publicUrl: text('public_url').notNull(),
    mime: varchar('mime', { length: 50 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('media_owner_idx').on(table.ownerId, table.kind)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 60 }).notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetId: uuid('target_id'),
    note: varchar('note', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_admin_idx').on(table.adminId),
    index('audit_logs_created_idx').on(table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Webinar = typeof webinars.$inferSelect;
export type NewWebinar = typeof webinars.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
