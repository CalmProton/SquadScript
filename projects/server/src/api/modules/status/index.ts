/**
 * @squadscript/server
 *
 * Status controller — /api/status
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { SquadServer } from '../../../server.js';
import type { MetricsCollector } from '../../../metrics/collector.js';
import { authGuard, checkAuth } from '../../plugins/auth.js';
import { StatusService } from './service.js';

export function createStatusModule(squadServer: SquadServer, metricsCollector: MetricsCollector) {
  return new Elysia()
    .use(authGuard)

    .get('/status', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      return StatusService.getSnapshot(squadServer, metricsCollector);
    });
}
