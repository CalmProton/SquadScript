/**
 * @squadscript/server
 *
 * Root ElysiaJS API — mounts all modules, plugins, and WebSocket handler.
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { SquadServer } from '../server.js';
import type { DrizzleDB } from '../db/index.js';
import type { MetricsCollector } from '../metrics/collector.js';

import { corsPlugin } from './plugins/cors.js';
import { createAuthModule } from './modules/auth/index.js';
import { createStatusModule } from './modules/status/index.js';
import { createPlayersModule } from './modules/players/index.js';
import { createSquadsModule } from './modules/squads/index.js';
import { createRconModule } from './modules/rcon/index.js';
import { createLayersModule } from './modules/layers/index.js';
import { createPluginsModule } from './modules/plugins/index.js';
import { createConfigModule } from './modules/config/index.js';
import { createLogsModule } from './modules/logs/index.js';
import { createUsersModule } from './modules/users/index.js';
import { createMetricsModule } from './modules/metrics/index.js';
import { createNotificationsModule } from './modules/notifications/index.js';
import { createWsHandler } from './websocket/handler.js';

/**
 * Creates the ElysiaJS API server instance.
 *
 * @param squadServer - The running SquadServer instance
 * @param db - Drizzle database instance
 * @param metricsCollector - Metrics collector instance
 * @returns Configured Elysia app (call `.listen(port)` to start)
 */
export function createApi(
  squadServer: SquadServer,
  db: DrizzleDB,
  metricsCollector: MetricsCollector,
) {
  return new Elysia({ prefix: '/api' })
    .use(corsPlugin)
    .use(createAuthModule(db))
    .use(createStatusModule(squadServer, metricsCollector))
    .use(createPlayersModule(squadServer, db))
    .use(createSquadsModule(squadServer, db))
    .use(createRconModule(squadServer, db))
    .use(createLayersModule(squadServer, db))
    .use(createPluginsModule(squadServer))
    .use(createConfigModule())
    .use(createLogsModule(db))
    .use(createUsersModule(db))
    .use(createMetricsModule(db, metricsCollector))
    .use(createNotificationsModule(db))
    .use(createWsHandler(squadServer, metricsCollector));
}
