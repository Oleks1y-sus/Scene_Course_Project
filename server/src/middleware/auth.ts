import type { RequestHandler } from 'express';
import { asyncRoute } from '../lib/http.js';
import { unauthorized, forbidden } from '../lib/errors.js';
import { loadSession, sessionTokenFromRequest } from '../services/session.js';

export const optionalAuth: RequestHandler = asyncRoute(async (req, _res, next) => {
  const token = sessionTokenFromRequest(req);
  if (token) {
    const session = await loadSession(token);
    if (session) {
      req.user = session.user;
      req.sessionId = session.sessionId;
    }
  }
  next();
});

/**
 * Must be mounted after `optionalAuth` for the same router. It intentionally
 * does not query the database again.
 */
export const requireAuth: RequestHandler = asyncRoute(async (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
});

export const requireAdmin: RequestHandler = asyncRoute(async (req, _res, next) => {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'ADMIN') throw forbidden('Ця дія доступна лише адміністраторам.');
  if (req.user.mustChangePassword) {
    throw forbidden('Спочатку змініть тимчасовий пароль у налаштуваннях профілю.');
  }
  next();
});
