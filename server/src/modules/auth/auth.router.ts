import { Router } from 'express';
import { asyncRoute, parseBody } from '../../lib/http.js';
import { clearSessionCookie, revokeSession } from '../../services/session.js';
import {
  authLimiter,
  noStore,
  passwordResetLimiter,
  registerLimiter,
  loginLimiter,
} from '../../middleware/rateLimit.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas.js';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from './auth.service.js';

export const authRouter = Router();

authRouter.use(noStore);

authRouter.post(
  '/register',
  registerLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(registerSchema, req);
    const result = await registerUser(input, req, res);
    res.status(201).json({ data: result });
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(loginSchema, req);
    const result = await loginUser(input, req, res);
    res.json({ data: result });
  }),
);

authRouter.post(
  '/password/forgot',
  passwordResetLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(forgotPasswordSchema, req);
    const result = await requestPasswordReset(input);
    res.json({ data: result });
  }),
);

authRouter.post(
  '/password/reset',
  passwordResetLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(resetPasswordSchema, req);
    await resetPassword(input);
    res.json({ data: { ok: true } });
  }),
);

authRouter.post(
  '/logout',
  authLimiter,
  asyncRoute(async (req, res) => {
    if (req.sessionId) await revokeSession(req.sessionId);
    clearSessionCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  asyncRoute(async (req, res) => {
    if (!req.user) {
      clearSessionCookie(res);
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Потрібно увійти в акаунт.' },
      });
      return;
    }
    res.json({ data: { user: req.user } });
  }),
);
