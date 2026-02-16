/**
 * @squadscript/server
 *
 * Squad server plugin for ElysiaJS.
 * Decorates the SquadServer instance and DB onto the Elysia context.
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { SquadServer } from '../../server.js';
import type { DrizzleDB } from '../../db/index.js';
import type { MetricsCollector } from '../../metrics/collector.js';

/**
 * Creates an Elysia plugin that attaches the SquadServer, database, and
 * metrics collector to every request context.
 */
export function squadServerPlugin(
  squadServer: SquadServer,
  db: DrizzleDB,
  metricsCollector: MetricsCollector,
) {
  return new Elysia({ name: 'SquadServer.Plugin' })
    .decorate('squadServer', squadServer)
    .decorate('db', db)
    .decorate('metricsCollector', metricsCollector);
}
