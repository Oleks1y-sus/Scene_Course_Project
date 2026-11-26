import { z } from 'zod';
import { REPORT_REASONS } from '../../db/schema.js';
import { hasMarkup, normalizeText } from '../../lib/text.js';

export const reportDetailsSchema = z
  .string()
  .max(1200, 'Коментар занадто довгий.')
  .transform((value) => normalizeText(value, true))
  .refine((value) => value.length <= 500, 'Коментар має містити не більше 500 символів.')
  .refine((value) => !hasMarkup(value), 'Коментар не може містити HTML-символи.')
  .optional();

export const createReportSchema = z
  .object({
    targetType: z.enum(['WEBINAR', 'USER'], { error: 'Некоректний тип скарги.' }),
    targetId: z.uuid('Некоректний об’єкт скарги.'),
    reason: z.enum(REPORT_REASONS, { error: 'Оберіть причину скарги.' }),
    details: reportDetailsSchema,
  })
  .strict();

export type CreateReportInput = z.infer<typeof createReportSchema>;
