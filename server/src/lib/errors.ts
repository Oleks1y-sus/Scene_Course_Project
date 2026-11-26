import type { z } from 'zod';

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { fields?: Record<string, string>; details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = options?.fields;
    this.details = options?.details;
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError(400, 'BAD_REQUEST', message, { fields });

export const unauthorized = (message = 'Потрібно увійти в акаунт.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Недостатньо прав для цієї дії.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Запис не знайдено.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string, fields?: Record<string, string>) =>
  new AppError(409, 'CONFLICT', message, { fields });

export const tooManyRequests = (message = 'Забагато спроб. Спробуйте пізніше.') =>
  new AppError(429, 'TOO_MANY_REQUESTS', message);

export const validationError = (error: z.ZodError) => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return new AppError(422, 'VALIDATION_ERROR', 'Перевірте виділені поля.', { fields });
};
