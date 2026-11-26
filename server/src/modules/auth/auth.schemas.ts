import { z } from 'zod';
import {
  cleanupDisplayName,
  isValidDisplayName,
} from '../../lib/text.js';

export const emailSchema = z
  .email({ error: 'Введіть коректну електронну пошту.' })
  .max(254, 'Пошта занадто довга.')
  .transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string({ error: 'Введіть пароль.' })
  .min(10, 'Пароль має містити щонайменше 10 символів.')
  .max(128, 'Пароль занадто довгий.')
  .refine((value) => /[a-zа-яіїєґ]/.test(value), 'Додайте хоча б одну малу літеру.')
  .refine((value) => /[A-ZА-ЯІЇЄҐ]/.test(value), 'Додайте хоча б одну велику літеру.')
  .refine((value) => /\d/.test(value), 'Додайте хоча б одну цифру.');

export const displayNameSchema = z
  .string({ error: 'Введіть ім’я.' })
  .max(80, 'Ім’я занадто довге.')
  .transform(cleanupDisplayName)
  .refine((value) => value.length >= 2, 'Ім’я має містити щонайменше 2 символи.')
  .refine((value) => value.length <= 60, 'Ім’я має містити не більше 60 символів.')
  .refine(isValidDisplayName, 'Ім’я може містити лише літери, пробіли, апостроф, крапку та дефіс.');

export const codeSchema = z
  .string({ error: 'Введіть код.' })
  .trim()
  .regex(/^\d{6}$/, 'Код має містити 6 цифр.');

export const registerSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    acceptTerms: z.boolean().refine((value) => value, 'Підтвердьте згоду з умовами.'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string({ error: 'Введіть пароль.' }).min(1, 'Введіть пароль.').max(128, 'Пароль занадто довгий.'),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    email: emailSchema,
    code: codeSchema,
  })
  .strict();

export const verifyLoginSchema = z
  .object({
    email: emailSchema,
    code: codeSchema,
  })
  .strict();

export const resendCodeSchema = z
  .object({
    email: emailSchema,
    purpose: z.enum(['VERIFY_EMAIL', 'LOGIN'], { error: 'Некоректна дія.' }),
  })
  .strict();
