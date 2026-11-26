import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { badRequest, validationError } from './errors.js';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncRoute = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export const parseBody = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => {
  const result = schema.safeParse(req.body);
  if (!result.success) throw validationError(result.error);
  return result.data;
};

export const parseQuery = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => {
  const result = schema.safeParse(req.query);
  if (!result.success) throw validationError(result.error);
  return result.data;
};

export const parseUuid = (value: unknown, field = 'id'): string => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw badRequest('Некоректний ідентифікатор.', { [field]: 'Некоректний ідентифікатор.' });
  }
  return value;
};

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const buildMeta = (pagination: Pagination, total: number): PageMeta => ({
  page: pagination.page,
  limit: pagination.limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
});

export const isUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  return code === '23505';
};
