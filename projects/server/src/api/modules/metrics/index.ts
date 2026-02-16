/**
 * @squadscript/server
 *
 * Metrics controller — /api/metrics/*
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { DrizzleDB } from '../../../db/index.js';
import { MetricsRepository } from '../../../db/repositories/metrics.repo.js';
import type { MetricsCollector } from '../../../metrics/collector.js';
import { authGuard, checkAuth } from '../../plugins/auth.js';

export function createMetricsModule(db: DrizzleDB, metricsCollector: MetricsCollector) {
  return new Elysia({ prefix: '/metrics' })
    .use(authGuard)

    .get('/current', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const snapshot = metricsCollector.getCurrentSnapshot();
      return {
        playerCount: snapshot.playerCount,
        tickRate: snapshot.tickRate,
        cpuPercent: snapshot.cpuPercent,
        memoryMb: snapshot.memoryMb,
        publicQueue: snapshot.publicQueue,
        reserveQueue: snapshot.reserveQueue,
        uptime: snapshot.uptime,
        timestamp: snapshot.timestamp.toISOString(),
      };
    })

    .get('/history', async ({ query, user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const repo = new MetricsRepository(db);

      const data = await repo.query({
        ...(query.from != null ? { from: new Date(query.from) } : {}),
        ...(query.to != null ? { to: new Date(query.to) } : {}),
        limit: query.limit ? Number(query.limit) : 1000,
      });

      return data.map((m) => ({
        playerCount: m.playerCount,
        tickRate: m.tickRate,
        cpuPercent: m.cpuPercent,
        memoryMb: m.memoryMb,
        publicQueue: m.publicQueue,
        reserveQueue: m.reserveQueue,
        sampledAt: m.sampledAt.toISOString(),
      }));
    });
}
