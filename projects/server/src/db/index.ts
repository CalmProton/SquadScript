/**
 * @squadscript/server
 *
 * Database connection setup using Drizzle ORM with bun:sql.
 *
 * @module
 */

import { drizzle } from 'drizzle-orm/bun-sql';

import * as schema from './schema.js';

const DEFAULT_DATABASE_URL = 'postgresql://squadscript:squadscript@localhost:5432/squadscript';

/**
 * Creates a Drizzle ORM database instance connected to PostgreSQL.
 *
 * @param databaseUrl - PostgreSQL connection URL (defaults to DATABASE_URL env or localhost)
 * @returns Drizzle database instance with full schema awareness
 */
export function createDatabase(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  return drizzle(url, { schema });
}

export type DrizzleDB = ReturnType<typeof createDatabase>;

export { schema };
