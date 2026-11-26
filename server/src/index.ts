import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { revokeExpiredSessions } from './services/session.js';

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'scene-api:started');
});

const cleanupTimer = setInterval(() => {
  revokeExpiredSessions().catch((error: unknown) => {
    logger.warn({ error }, 'sessions:cleanup-failed');
  });
}, 6 * 60 * 60_000);
cleanupTimer.unref();

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'scene-api:stopping');
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'process:unhandled-rejection');
});
