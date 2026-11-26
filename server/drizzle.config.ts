import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL && process.env.DATABASE_URL !== 'pglite'
      ? process.env.DATABASE_URL
      : 'postgres://scene:scene@localhost:5432/scene',
  },
  verbose: true,
  strict: true,
});
