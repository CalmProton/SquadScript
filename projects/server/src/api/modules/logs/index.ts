/**
 * @squadscript/server
 *
 * Logs controller — /api/logs/*
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { DrizzleDB } from '../../../db/index.js';
import { EventLogRepository } from '../../../db/repositories/event-log.repo.js';
import { parsePagination } from '../../utils/pagination.js';
import { authGuard, checkAuth } from '../../plugins/auth.js';

export function createLogsModule(db: DrizzleDB) {
  return new Elysia({ prefix: '/logs' })
    .use(authGuard)

    .get('/', async ({ query, user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const { limit, offset } = parsePagination(query);
      const repo = new EventLogRepository(db);

      const filter = {
        ...(query.type != null ? { type: query.type } : {}),
        ...(query.player != null ? { player: query.player } : {}),
        ...(query.from != null ? { from: new Date(query.from) } : {}),
        ...(query.to != null ? { to: new Date(query.to) } : {}),
      };

      const data = await repo.query({ ...filter, limit, offset });
      const total = await repo.countByFilter(filter);

      return {
        data: data.map((entry) => ({
          id: entry.id,
          type: entry.type,
          message: entry.message,
          player: entry.player,
          playerEos: entry.playerEos,
          details: entry.details,
          createdAt: entry.createdAt.toISOString(),
        })),
        total,
        limit,
        offset,
      };
    });
}
