import { Router } from 'express';
import { asyncRoute, parseBody, parseQuery, parseUuid } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { noStore } from '../../middleware/rateLimit.js';
import { listWebinarsSchema } from './webinar.schemas.js';
import {
  cancelWebinar,
  createWebinar,
  deleteWebinar,
  endWebinar,
  favoriteWebinar,
  getWebinarForViewer,
  listWebinars,
  registerForWebinar,
  startWebinar,
  unfavoriteWebinar,
  unregisterFromWebinar,
  updateWebinar,
} from './webinar.service.js';
import { createWebinarSchema, updateWebinarSchema } from './webinar.schemas.js';
import { unauthorized } from '../../lib/errors.js';

export const webinarRouter = Router();

webinarRouter.use(noStore);

webinarRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const query = parseQuery(listWebinarsSchema, req);
    const viewer = req.user ?? null;

    if ((query.mine || query.favorites || query.attended) && !viewer) {
      throw unauthorized();
    }

    const result = await listWebinars({
      viewer,
      q: query.q,
      category: query.category,
      scope: query.scope,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      ownerId: query.mine ? viewer?.id : undefined,
      favoritesOnly: query.favorites,
      attendedOnly: query.attended,
    });

    res.json({ data: result.items, meta: result.meta });
  }),
);

webinarRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const webinar = await getWebinarForViewer(id, req.user ?? null);
    res.json({ data: webinar });
  }),
);

webinarRouter.post(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const input = parseBody(createWebinarSchema, req);
    const webinar = await createWebinar(req.user!, input);
    res.status(201).json({ data: webinar });
  }),
);

webinarRouter.patch(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const input = parseBody(updateWebinarSchema, req);
    const webinar = await updateWebinar(id, req.user!, input);
    res.json({ data: webinar });
  }),
);

webinarRouter.delete(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    await deleteWebinar(id, req.user!);
    res.status(204).send();
  }),
);

webinarRouter.post(
  '/:id/start',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const webinar = await startWebinar(id, req.user!);
    res.json({ data: webinar });
  }),
);

webinarRouter.post(
  '/:id/end',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const webinar = await endWebinar(id, req.user!);
    res.json({ data: webinar });
  }),
);

webinarRouter.post(
  '/:id/cancel',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const webinar = await cancelWebinar(id, req.user!);
    res.json({ data: webinar });
  }),
);

webinarRouter.post(
  '/:id/favorite',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const result = await favoriteWebinar(id, req.user!);
    res.json({ data: result });
  }),
);

webinarRouter.delete(
  '/:id/favorite',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const result = await unfavoriteWebinar(id, req.user!);
    res.json({ data: result });
  }),
);

webinarRouter.post(
  '/:id/register',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const result = await registerForWebinar(id, req.user!);
    res.status(201).json({ data: result });
  }),
);

webinarRouter.delete(
  '/:id/register',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = parseUuid(req.params.id);
    const result = await unregisterFromWebinar(id, req.user!);
    res.json({ data: result });
  }),
);
