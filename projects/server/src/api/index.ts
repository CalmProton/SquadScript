/**
 * @squadscript/server
 *
 * Root ElysiaJS API — mounts all modules, plugins, and WebSocket handler.
 *
 * @module
 */

import { Elysia } from 'elysia';
import { serverTiming } from '@elysiajs/server-timing';
import { openapi } from '@elysiajs/openapi';

import type { SquadServer } from '../server.js';
import type { DrizzleDB } from '../db/index.js';
import type { MetricsCollector } from '../metrics/collector.js';
import type { PluginManager } from '../plugins/manager.js';

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
 * @param pluginManager - Plugin manager instance (optional)
 * @returns Configured Elysia app (call `.listen(port)` to start)
 */
export function createApi(
  squadServer: SquadServer,
  db: DrizzleDB,
  metricsCollector: MetricsCollector,
  pluginManager: PluginManager | null = null,
) {
  return new Elysia({ prefix: '/api' })
    .use(corsPlugin)
    .use(serverTiming())
    .use(openapi({
      documentation: {
        info: {
          title: 'SquadScript API',
          version: '0.1.0',
          description: 'SquadScript server management API',
        },
      },
    }))
    .use(createAuthModule(db))
    .use(createStatusModule(squadServer, metricsCollector))
    .use(createPlayersModule(squadServer, db))
    .use(createSquadsModule(squadServer, db))
    .use(createRconModule(squadServer, db))
    .use(createLayersModule(squadServer, db))
    .use(createPluginsModule(pluginManager))
    .use(createConfigModule())
    .use(createLogsModule(db))
    .use(createUsersModule(db))
    .use(createMetricsModule(db, metricsCollector))
    .use(createNotificationsModule(db))
    .use(createWsHandler(squadServer, metricsCollector));
}
