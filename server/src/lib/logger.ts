import { pino } from 'pino';
import { env } from '../env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      'code',
      'token',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'scene-api' },
});
