import { z } from 'zod';
import { AVATAR_PRESETS } from '../../lib/presets.js';
import { hasMarkup, isAllowedBio, normalizeText } from '../../lib/text.js';
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
} from '../auth/auth.schemas.js';

export const bioSchema = z
  .string()
  .max(400, 'Опис занадто довгий.')
  .transform((value) => normalizeText(value, true))
  .refine((value) => value.length <= 280, 'Опис має містити не більше 280 символів.')
  .refine((value) => !hasMarkup(value), 'Опис не може містити HTML-символи.')
  .refine(isAllowedBio, 'Опис містить недопустимі символи.');

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    bio: bioSchema.nullable().optional(),
    avatarPreset: z.enum(AVATAR_PRESETS).optional(),
    avatarMediaId: z.uuid('Некоректний файл аватара.').optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Немає змін для збереження.')
  .refine(
    (value) => !(value.avatarPreset && value.avatarMediaId),
    'Оберіть або готовий аватар, або завантажене зображення.',
  );

export const requestEmailChangeSchema = z
  .object({
    newEmail: emailSchema,
    password: z.string({ error: 'Введіть пароль.' }).min(1, 'Введіть пароль.').max(128),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Введіть поточний пароль.' }).min(1, 'Введіть поточний пароль.').max(128),
    newPassword: passwordSchema,
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    password: z.string({ error: 'Введіть пароль.' }).min(1, 'Введіть пароль.').max(128),
  })
  .strict();
