import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { env } from '../env.js';

export const createLocalPglite = async (): Promise<PGlite> => {
  const { PGlite } = await import('@electric-sql/pglite');
  if (env.PGLITE_DATA_DIR === 'memory://') {
    return new PGlite();
  }

  const dataDir = path.resolve(env.PGLITE_DATA_DIR);
  mkdirSync(path.dirname(dataDir), { recursive: true });
  return new PGlite(dataDir);
};
