import { Router } from 'express';
import { asyncRoute, parseBody, parseQuery, parseUuid } from '../../lib/http.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { adminMutationLimiter, noStore } from '../../middleware/rateLimit.js';
import {
  auditQuerySchema,
  adminReportQuerySchema,
  adminUserQuerySchema,
  adminUserUpdateSchema,
  adminWebinarQuerySchema,
  adminWebinarUpdateSchema,
  createAdminSchema,
  resolveReportSchema,
} from './admin.schemas.js';
import {
  createAdminAccount,
  deleteAdminUser,
  deleteAdminWebinar,
  getAdminStats,
  listAdminUsers,
  listAdminWebinars,
  listAudit,
  listReports,
  resolveReport,
  updateAdminUser,
  updateAdminWebinar,
} from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(noStore, requireAuth, requireAdmin);

adminRouter.get(
  '/stats',
  asyncRoute(async (_req, res) => {
    res.json({ data: await getAdminStats() });
  }),
);

adminRouter.get(
  '/reports',
  asyncRoute(async (req, res) => {
    const query = parseQuery(adminReportQuerySchema, req);
    const result = await listReports(query);
    res.json({ data: result.items, meta: result.meta });
  }),
);

adminRouter.patch(
  '/reports/:id',
  adminMutationLimiter,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const input = parseBody(resolveReportSchema, req);
    const result = await resolveReport(id, req.user!, input);
    res.json({ data: result });
  }),
);

adminRouter.get(
  '/webinars',
  asyncRoute(async (req, res) => {
    const query = parseQuery(adminWebinarQuerySchema, req);
    const result = await listAdminWebinars(query, req.user!);
    res.json({ data: result.items, meta: result.meta });
  }),
);

adminRouter.patch(
  '/webinars/:id',
  adminMutationLimiter,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const input = parseBody(adminWebinarUpdateSchema, req);
    const webinar = await updateAdminWebinar(id, req.user!, input);
    res.json({ data: webinar });
  }),
);

adminRouter.delete(
  '/webinars/:id',
  adminMutationLimiter,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    await deleteAdminWebinar(id, req.user!);
    res.status(204).send();
  }),
);

adminRouter.get(
  '/users',
  asyncRoute(async (req, res) => {
    const query = parseQuery(adminUserQuerySchema, req);
    const result = await listAdminUsers(query);
    res.json({ data: result.items, meta: result.meta });
  }),
);

adminRouter.patch(
  '/users/:id',
  adminMutationLimiter,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const input = parseBody(adminUserUpdateSchema, req);
    const result = await updateAdminUser(id, req.user!, input);
    res.json({ data: result });
  }),
);

adminRouter.delete(
  '/users/:id',
  adminMutationLimiter,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    await deleteAdminUser(id, req.user!);
    res.status(204).send();
  }),
);

adminRouter.post(
  '/admins',
  adminMutationLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(createAdminSchema, req);
    const result = await createAdminAccount(req.user!, input);
    res.status(201).json({ data: result });
  }),
);

adminRouter.get(
  '/audit',
  asyncRoute(async (req, res) => {
    const query = parseQuery(auditQuerySchema, req);
    const result = await listAudit(query.page, query.limit);
    res.json({ data: result.items, meta: result.meta });
  }),
);
