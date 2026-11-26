import { z } from 'zod';
import { WEBINAR_CATEGORIES } from '../../db/schema.js';
import { COVER_PRESETS } from '../../lib/presets.js';
import {
  countLetters,
  hasMarkup,
  isAllowedTag,
  isAllowedTitle,
  normalizeText,
} from '../../lib/text.js';

const isoDateSchema = z
  .string({ error: 'Вкажіть дату та час.' })
  .max(40)
  .refine((value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value);
  }, 'Некоректна дата та час.')
  .transform((value) => new Date(value));

export const titleSchema = z
  .string({ error: 'Введіть назву.' })
  .max(160, 'Назва занадто довга.')
  .transform((value) => normalizeText(value))
  .refine((value) => value.length >= 5, 'Назва має містити щонайменше 5 символів.')
  .refine((value) => value.length <= 120, 'Назва має містити не більше 120 символів.')
  .refine((value) => !hasMarkup(value), 'Назва не може містити HTML-символи.')
  .refine(isAllowedTitle, 'Назва містить недопустимі символи.')
  .refine((value) => countLetters(value) >= 3, 'Назва має містити щонайменше 3 літери.');

export const descriptionSchema = z
  .string({ error: 'Додайте опис.' })
  .max(6000, 'Опис занадто довгий.')
  .transform((value) => normalizeText(value, true))
  .refine((value) => value.length >= 40, 'Опис має містити щонайменше 40 символів.')
  .refine((value) => value.length <= 5000, 'Опис має містити не більше 5000 символів.')
  .refine((value) => !hasMarkup(value), 'Опис не може містити HTML-символи.')
  .refine((value) => countLetters(value) >= 20, 'Додайте змістовний опис заходу.');

const tagListSchema = z
  .array(
    z
      .string()
      .max(40)
      .transform((value) => normalizeText(value).toLowerCase())
      .refine(isAllowedTag, 'Тег може містити літери, цифри та дефіс (2–24 символи).'),
  )
  .max(5, 'Можна додати не більше 5 тегів.')
  .transform((tags) => Array.from(new Set(tags)));

export const tagsSchema = tagListSchema.default([]);

export const coverSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('preset'), preset: z.enum(COVER_PRESETS) }).strict(),
  z.object({ type: z.literal('media'), mediaId: z.uuid('Некоректний файл обкладинки.') }).strict(),
]);

export const createWebinarSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    category: z.enum(WEBINAR_CATEGORIES, { error: 'Оберіть категорію.' }),
    tags: tagsSchema,
    startsAt: isoDateSchema,
    durationMinutes: z.coerce
      .number({ error: 'Вкажіть тривалість.' })
      .int('Тривалість має бути цілим числом.')
      .min(15, 'Мінімальна тривалість — 15 хвилин.')
      .max(480, 'Максимальна тривалість — 8 годин.'),
    capacity: z.coerce
      .number({ error: 'Вкажіть місткість.' })
      .int('Місткість має бути цілим числом.')
      .min(1, 'Мінімальна місткість — 1 учасник.')
      .max(10_000, 'Максимальна місткість — 10 000 учасників.'),
    cover: coverSchema.optional(),
  })
  .strict();

export const updateWebinarSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    category: z.enum(WEBINAR_CATEGORIES).optional(),
    tags: tagListSchema.optional(),
    startsAt: isoDateSchema.optional(),
    durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
    capacity: z.coerce.number().int().min(1).max(10_000).optional(),
    cover: coverSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Немає змін для збереження.');

export const listWebinarsSchema = z.object({
  q: z
    .string()
    .max(80, 'Пошуковий запит занадто довгий.')
    .optional()
    .transform((value) => value?.trim() || undefined),
  category: z.enum(WEBINAR_CATEGORIES).optional(),
  scope: z.enum(['active', 'completed', 'cancelled', 'all']).default('active'),
  sort: z.enum(['soonest', 'newest', 'popular', 'title']).default('soonest'),
  mine: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  favorites: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  attended: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateWebinarInput = z.infer<typeof createWebinarSchema>;
export type UpdateWebinarInput = z.infer<typeof updateWebinarSchema>;
export type ListWebinarsInput = z.infer<typeof listWebinarsSchema>;
