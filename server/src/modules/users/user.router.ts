import { Router } from 'express';
import { asyncRoute, parseBody } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { noStore } from '../../middleware/rateLimit.js';
import { clearSessionCookie } from '../../services/session.js';
import { changePassword, requestEmailChange } from '../auth/auth.service.js';
import { getProfileStats } from '../webinars/webinar.service.js';
import {
  changePasswordSchema,
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

userRouter.patch(
  '/me/email',
  asyncRoute(async (req, res) => {
    const input = parseBody(requestEmailChangeSchema, req);
    const user = await requestEmailChange(req.user!, input.newEmail, input.password);
    res.json({ data: { user } });
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
