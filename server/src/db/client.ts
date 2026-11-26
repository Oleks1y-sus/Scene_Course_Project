import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

const createDatabase = async (): Promise<Database> => {
  if (env.DATABASE_URL === 'pglite') {
    const { drizzle } = await import('drizzle-orm/pglite');
    const { createLocalPglite } = await import('./pglite.js');
    const client = await createLocalPglite();
    return drizzle(client, { schema }) as unknown as Database;
  }

  const needsSsl = env.DATABASE_SSL || /sslmode=require/i.test(env.DATABASE_URL);
  const client = postgres(env.DATABASE_URL, {
    max: env.DB_POOL_MAX,
    prepare: false,
    ssl: needsSsl ? 'require' : false,
    onnotice: () => undefined,
  });

  return drizzlePg(client, { schema });
};

export const db = await createDatabase();
export { schema };
