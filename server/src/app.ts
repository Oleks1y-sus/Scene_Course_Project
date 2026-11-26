import { randomUUID } from 'node:crypto';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { allowedOrigins, env, isProduction } from './env.js';
import { AppError } from './lib/errors.js';
import { isUniqueViolation } from './lib/http.js';
import { logger } from './lib/logger.js';
import { optionalAuth } from './middleware/auth.js';
import { csrfGuard } from './middleware/csrf.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { reportRouter } from './modules/reports/report.router.js';
import { uploadRouter } from './modules/uploads/upload.router.js';
import { userRouter } from './modules/users/user.router.js';
import { webinarRouter } from './modules/webinars/webinar.router.js';

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ресурс не знайдено.' },
  });
};

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) return;

  const requestId = String(res.getHeader('X-Request-Id') ?? '');

  if (error instanceof AppError) {
    if (error.status >= 500) logger.error({ error, requestId }, 'request:failed');
    else logger.warn({ code: error.code, requestId }, 'request:rejected');

    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
        ...(!isProduction && error.details ? { details: error.details } : {}),
        requestId,
      },
    });
    return;
  }

  if (isUniqueViolation(error)) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'Запис уже існує.', requestId },
    });
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && (error as { status?: number }).status === 400) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Некоректний формат запиту.', requestId },
    });
    return;
  }

  logger.error({ error, requestId, path: req.path }, 'request:unhandled');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Внутрішня помилка сервера. Спробуйте пізніше.',
      requestId,
    },
  });
};

export const createApp = () => {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'CORS_REJECTED', 'Джерело запиту не дозволене.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      maxAge: 86_400,
    }),
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use(csrfGuard);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  });

  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  app.use(
    '/uploads',
    express.static(uploadRoot, {
      index: false,
      dotfiles: 'deny',
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.use('/api/v1', globalLimiter, optionalAuth);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/webinars', webinarRouter);
  app.use('/api/v1/uploads', uploadRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
