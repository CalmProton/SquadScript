/**
 * @squadscript/server
 *
 * Database migration runner.
 * Applies pending migrations on server startup.
 *
 * @module
 */

import { migrate } from 'drizzle-orm/bun-sql/migrator';

import { createDatabase } from './index.js';

/**
 * Runs all pending database migrations.
 *
 * @param databaseUrl - Optional database URL override
 */
export async function runMigrations(databaseUrl?: string): Promise<void> {
  const db = createDatabase(databaseUrl);
  await migrate(db, { migrationsFolder: './src/db/migrations' });
}
