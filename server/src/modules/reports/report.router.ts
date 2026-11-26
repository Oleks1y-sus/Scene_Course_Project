import { Router } from 'express';
import { asyncRoute, parseBody } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { reportLimiter } from '../../middleware/rateLimit.js';
import { createReportSchema } from './report.schemas.js';
import { createReport } from './report.service.js';

export const reportRouter = Router();

reportRouter.post(
  '/',
  requireAuth,
  reportLimiter,
  asyncRoute(async (req, res) => {
    const input = parseBody(createReportSchema, req);
    const result = await createReport(req.user!, input);
    res.status(201).json({ data: result });
  }),
);
