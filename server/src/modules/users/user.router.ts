import { Router } from 'express';
import { asyncRoute, parseBody } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { noStore } from '../../middleware/rateLimit.js';
import { clearSessionCookie } from '../../services/session.js';
import {
  changePassword,
  confirmEmailChange,
  requestEmailChange,
  resendEmailChangeCode,
} from '../auth/auth.service.js';
import { getProfileStats } from '../webinars/webinar.service.js';
import {
  changePasswordSchema,
  confirmEmailChangeSchema,
  deleteAccountSchema,
  requestEmailChangeSchema,
  updateProfileSchema,
} from './user.schemas.js';
import { deleteAccount, updateProfile } from './user.service.js';

export const userRouter = Router();

userRouter.use(noStore);
userRouter.use(requireAuth);

userRouter.get(
  '/me',
  asyncRoute(async (req, res) => {
    res.json({ data: { user: req.user } });
  }),
);

userRouter.get(
  '/me/stats',
  asyncRoute(async (req, res) => {
    const stats = await getProfileStats(req.user!.id);
    res.json({ data: stats });
  }),
);

userRouter.patch(
  '/me',
  asyncRoute(async (req, res) => {
    const input = parseBody(updateProfileSchema, req);
    const user = await updateProfile(req.user!.id, input);
    res.json({ data: { user } });
  }),
);

userRouter.post(
  '/me/email',
  asyncRoute(async (req, res) => {
    const input = parseBody(requestEmailChangeSchema, req);
    const result = await requestEmailChange(req.user!, input.newEmail, input.password);
    res.json({ data: result });
  }),
);

userRouter.post(
  '/me/email/verify',
  asyncRoute(async (req, res) => {
    const input = parseBody(confirmEmailChangeSchema, req);
    const user = await confirmEmailChange(req.user!, input.code);
    res.json({ data: { user } });
  }),
);

userRouter.post(
  '/me/email/resend',
  asyncRoute(async (req, res) => {
    const result = await resendEmailChangeCode(req.user!);
    res.json({ data: result });
  }),
);

userRouter.patch(
  '/me/password',
  asyncRoute(async (req, res) => {
    const input = parseBody(changePasswordSchema, req);
    await changePassword(req.user!, input, req.sessionId);
    res.json({ data: { ok: true } });
  }),
);

userRouter.delete(
  '/me',
  asyncRoute(async (req, res) => {
    const input = parseBody(deleteAccountSchema, req);
    await deleteAccount(req.user!.id, input.password);
    clearSessionCookie(res);
    res.status(204).send();
  }),
);
