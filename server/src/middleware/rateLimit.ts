import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

const handler = (_req: Request, res: Response): void => {
  res.status(429).json({
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Забагато запитів. Спробуйте трохи пізніше.',
    },
  });
};

const createLimiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler,
    skip: () => env.RATE_LIMIT_DISABLED,
  });

export const globalLimiter = createLimiter(15 * 60_000, 400);
export const authLimiter = createLimiter(15 * 60_000, 40);
export const loginLimiter = createLimiter(15 * 60_000, 20);
export const registerLimiter = createLimiter(60 * 60_000, 6);
export const passwordResetLimiter = createLimiter(60 * 60_000, 8);
export const reportLimiter = createLimiter(60 * 60_000, 12);
export const uploadLimiter = createLimiter(60 * 60_000, 40);
export const adminMutationLimiter = createLimiter(15 * 60_000, 200);

export const noStore = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
