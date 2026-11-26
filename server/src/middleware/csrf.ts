import type { NextFunction, Request, Response } from 'express';
import { env, allowedOrigins, isTest } from '../env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const normalizeOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

/**
 * Cross-site request forgery defence:
 * 1. the session cookie is SameSite=Lax, so cross-site POSTs never carry it;
 * 2. for every state-changing request we additionally require a trusted
 *    Origin/Referer header (defence in depth for older browsers and misconfig).
 */
export const csrfGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const trusted = allowedOrigins.map(normalizeOrigin);

  if (origin) {
    if (trusted.includes(normalizeOrigin(origin))) {
      next();
      return;
    }
    res.status(403).json({
      error: { code: 'CSRF_REJECTED', message: 'Запит відхилено: недозволене джерело.' },
    });
    return;
  }

  if (referer) {
    const refererOrigin = normalizeOrigin(referer);
    if (trusted.includes(refererOrigin)) {
      next();
      return;
    }
  }

  if (env.ALLOW_ORIGINLESS_REQUESTS || isTest) {
    next();
    return;
  }

  res.status(403).json({
    error: { code: 'CSRF_REJECTED', message: 'Запит відхилено: відсутній Origin.' },
  });
};
