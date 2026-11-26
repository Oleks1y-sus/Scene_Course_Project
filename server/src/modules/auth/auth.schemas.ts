import { z } from 'zod';

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

const credentialNameSchema = (label: string) =>
  z
    .string({ error: `Введіть ${label}.` })
    .trim()
    .toLowerCase()
    .min(3, `${label} має містити щонайменше 3 символи.`)
    .max(30, `${label} має містити не більше 30 символів.`)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      `${label} може містити лише латинські літери, цифри та підкреслення й має починатися з літери.`,
    );

export const usernameSchema = credentialNameSchema('юзернейм');
export const loginNameSchema = credentialNameSchema('логін');

export const registerSchema = z
  .object({
    username: usernameSchema,
    login: loginNameSchema,
    email: emailSchema,
    password: passwordSchema,
    acceptTerms: z.boolean().refine((value) => value, 'Підтвердьте згоду з умовами.'),
  })
  .strict();

export const loginSchema = z
  .object({
    login: loginNameSchema,
    password: z.string({ error: 'Введіть пароль.' }).min(1, 'Введіть пароль.').max(128, 'Пароль занадто довгий.'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    login: loginNameSchema,
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z
      .string({ error: 'Відсутній токен відновлення.' })
      .min(20, 'Некоректний токен відновлення.')
      .max(128, 'Некоректний токен відновлення.'),
    newPassword: passwordSchema,
  })
  .strict();
