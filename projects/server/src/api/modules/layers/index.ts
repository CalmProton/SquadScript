/**
 * @squadscript/server
 *
 * Layers controller — /api/layers/*
 *
 * @module
 */

import { Elysia, t } from 'elysia';

import type { SquadServer } from '../../../server.js';
import type { DrizzleDB } from '../../../db/index.js';
import { AuditRepository } from '../../../db/repositories/audit.repo.js';
import { authGuard, checkAuth, checkRole } from '../../plugins/auth.js';

export function createLayersModule(squadServer: SquadServer, db: DrizzleDB) {
  return new Elysia({ prefix: '/layers' })
    .use(authGuard)

    .get('/current', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const layer = squadServer.currentLayer;
      if (!layer) return null;
      return {
        name: layer.name,
        level: layer.level,
        gameMode: layer.gameMode,
        version: layer.version,
      };
    })

    .get('/next', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const layer = squadServer.nextLayer;
      if (!layer) return null;
      return {
        name: layer.name,
        level: layer.level,
        gameMode: layer.gameMode,
        version: layer.version,
      };
    })

    .post('/change', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await squadServer.execute(`AdminChangeLayer ${body.layer}`);
      if (!result.ok) {
        set.status = 400;
        return { error: result.error.message };
      }

      const auditRepo = new AuditRepository(db);
      await auditRepo.insert({
        userId: user!.id,
        action: 'map_change',
        details: { layer: body.layer },
      });

      return { ok: true };
    }, {
      body: t.Object({
        layer: t.String({ minLength: 1 }),
      }),
    })

    .post('/set-next', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await squadServer.execute(`AdminSetNextLayer ${body.layer}`);
      if (!result.ok) {
        set.status = 400;
        return { error: result.error.message };
      }

      const auditRepo = new AuditRepository(db);
      await auditRepo.insert({
        userId: user!.id,
        action: 'set_next_layer',
        details: { layer: body.layer },
      });

      return { ok: true };
    }, {
      body: t.Object({
        layer: t.String({ minLength: 1 }),
      }),
    });
}
