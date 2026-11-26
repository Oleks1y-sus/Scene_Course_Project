import { z } from 'zod';
import {
  MODERATION_STATUSES,
  REPORT_STATUSES,
  USER_ROLES,
  USER_STATUSES,
} from '../../db/schema.js';
import {
  emailSchema,
  loginNameSchema,
  passwordSchema,
  usernameSchema,
} from '../auth/auth.schemas.js';
import { hasMarkup, normalizeText } from '../../lib/text.js';

export const adminReportQuerySchema = z.object({
  status: z.enum([...REPORT_STATUSES, 'all']).default('OPEN'),
  targetType: z.enum(['WEBINAR', 'USER']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const resolveReportSchema = z
  .object({
    action: z.enum([
      'HIDE_WEBINAR',
      'RESTORE_WEBINAR',
      'SHADOW_BAN_USER',
      'BAN_USER',
      'ACTIVATE_USER',
      'DISMISS',
    ]),
    note: z
      .string()
      .max(600)
      .transform((value) => normalizeText(value, true))
      .refine((value) => value.length <= 500, 'Нотатка занадто довга.')
      .refine((value) => !hasMarkup(value), 'Нотатка містить недопустимі символи.')
      .optional(),
  })
  .strict();

export const adminWebinarQuerySchema = z.object({
  q: z.string().max(80).optional().transform((value) => value?.trim() || undefined),
  moderation: z.enum(MODERATION_STATUSES).optional(),
  scope: z.enum(['active', 'completed', 'cancelled', 'all']).default('all'),
  sort: z.enum(['soonest', 'newest', 'popular', 'title']).default('newest'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const adminWebinarUpdateSchema = z
  .object({
    moderationStatus: z.enum(MODERATION_STATUSES).optional(),
    note: z
      .string()
      .max(600)
      .transform((value) => normalizeText(value, true))
      .refine((value) => !hasMarkup(value), 'Нотатка містить недопустимі символи.')
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Немає змін для збереження.');

export const adminUserQuerySchema = z.object({
  q: z.string().max(80).optional().transform((value) => value?.trim() || undefined),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
    note: z
      .string()
      .max(600)
      .transform((value) => normalizeText(value, true))
      .refine((value) => !hasMarkup(value), 'Нотатка містить недопустимі символи.')
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Немає змін для збереження.');

export const createAdminSchema = z
  .object({
    username: usernameSchema,
    login: loginNameSchema,
    email: emailSchema,
    password: passwordSchema.optional(),
  })
  .strict();

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
