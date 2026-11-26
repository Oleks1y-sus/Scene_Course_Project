import path from 'node:path';
import { env } from '../env.js';
import * as schema from './schema.js';

const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

const run = async (): Promise<void> => {
  if (env.DATABASE_URL === 'pglite') {
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const { createLocalPglite } = await import('./pglite.js');
    const client = await createLocalPglite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    await client.close();
  } else {
    const postgres = (await import('postgres')).default;
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const needsSsl = env.DATABASE_SSL || /sslmode=require/i.test(env.DATABASE_URL);
    const client = postgres(env.DATABASE_URL, {
      max: 1,
      prepare: false,
      ssl: needsSsl ? 'require' : false,
    });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    await client.end();
  }

  console.log('Database migrations applied.');
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
