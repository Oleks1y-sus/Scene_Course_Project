import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),

  DATABASE_URL: z.string().min(1).default('pglite'),
  DATABASE_SSL: bool.default(false),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  PGLITE_DATA_DIR: z.string().min(1).default('./.data/pglite'),

  FRONTEND_URL: z.url().default('http://localhost:3000'),
  CORS_EXTRA_ORIGINS: z.string().default(''),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SESSION_COOKIE_NAME: z.string().regex(/^[a-z0-9_]+$/).default('scene_session'),
  COOKIE_SECURE: bool.default(false),

  SESSION_PEPPER: z.string().min(32).default('dev-only-session-pepper-change-me-please-123456789'),
  OTP_PEPPER: z.string().min(32).default('dev-only-otp-pepper-change-me-please-123456789'),
  IP_PEPPER: z.string().min(32).default('dev-only-ip-pepper-change-me-please-123456789'),

  MAIL_MODE: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM: z.string().default('Сцена <no-reply@scene.example>'),
  SUPPORT_EMAIL: z.email().default('support@scene.example'),
  EXPOSE_DEV_CODES: bool.default(true),

  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('scene-media'),
  UPLOAD_DIR: z.string().default('./uploads'),

  ADMIN_EMAIL: z.email().default('admin@scene.local'),
  ADMIN_PASSWORD: z.string().min(10).default('Admin12345!'),
  ADMIN_NAME: z.string().min(2).max(60).default('Адміністратор'),
  SEED_DEMO: bool.default(true),
  DEMO_PASSWORD: z.string().min(10).default('Demo12345!'),

  RATE_LIMIT_DISABLED: bool.default(false),
  ALLOW_ORIGINLESS_REQUESTS: bool.default(false),
  MAX_ACTIVE_SESSIONS: z.coerce.number().int().min(1).max(50).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

export const allowedOrigins = [
  env.FRONTEND_URL,
  ...env.CORS_EXTRA_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter((origin, index, list) => list.indexOf(origin) === index);

if (isProduction) {
  if (env.DATABASE_URL === 'pglite') {
    throw new Error('DATABASE_URL=pglite is not allowed in production. Configure Supabase PostgreSQL.');
  }
  if (env.SESSION_PEPPER.startsWith('dev-only') || env.OTP_PEPPER.startsWith('dev-only')) {
    throw new Error('Replace the development session/OTP peppers before running in production.');
  }
  if (env.MAIL_MODE !== 'resend' || !env.RESEND_API_KEY) {
    throw new Error('Production requires MAIL_MODE=resend and a valid RESEND_API_KEY.');
  }
  if (env.EXPOSE_DEV_CODES) {
    throw new Error('EXPOSE_DEV_CODES must be false in production.');
  }
  if (!env.COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in production.');
  }
  if (!env.FRONTEND_URL.startsWith('https://')) {
    throw new Error('FRONTEND_URL must use HTTPS in production.');
  }
}

if (env.COOKIE_SECURE && env.FRONTEND_URL.startsWith('http://localhost')) {
  // Local HTTPS setups are rare; warn instead of failing so the app stays usable.
  console.warn('[env] COOKIE_SECURE=true with a localhost FRONTEND_URL — cookies may not be sent over HTTP.');
}
