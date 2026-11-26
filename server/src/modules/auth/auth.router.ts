import { Router } from 'express';
import { asyncRoute, parseBody } from '../../lib/http.js';
import { clearSessionCookie, revokeSession } from '../../services/session.js';
import {
  authLimiter,
  loginLimiter,
  noStore,
  otpLimiter,
  registerLimiter,
} from '../../middleware/rateLimit.js';
import {
  loginSchema,
  registerSchema,
  resendCodeSchema,
  verifyEmailSchema,
  verifyLoginSchema,
} from './auth.schemas.js';
import {
  login,
  registerUser,
  resendCode,
  verifyEmail,
  verifyLogin,
} from './auth.service.js';

export const authRouter = Router();

authRouter.use(noStore);

authRouter.post(
  '/register',
  registerLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(registerSchema, req);
    const result = await registerUser(input);
    res.status(201).json({ data: result });
  }),
);

authRouter.post(
  '/verify-email',
  otpLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(verifyEmailSchema, req);
    const result = await verifyEmail(input, req, res);
    res.json({ data: result });
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(loginSchema, req);
    const result = await login(input);
    res.json({ data: result });
  }),
);

authRouter.post(
  '/login/verify',
  otpLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(verifyLoginSchema, req);
    const result = await verifyLogin(input, req, res);
    res.json({ data: result });
  }),
);

authRouter.post(
  '/resend',
  otpLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(resendCodeSchema, req);
    const result = await resendCode(input);
    res.json({ data: result });
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
