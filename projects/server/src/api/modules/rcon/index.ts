/**
 * @squadscript/server
 *
 * RCON controller — /api/rcon/*
 *
 * @module
 */

import { Elysia, t } from 'elysia';

import type { SquadServer } from '../../../server.js';
import type { DrizzleDB } from '../../../db/index.js';
import { AuditRepository } from '../../../db/repositories/audit.repo.js';
import { authGuard, checkRole } from '../../plugins/auth.js';

export function createRconModule(squadServer: SquadServer, db: DrizzleDB) {
  return new Elysia({ prefix: '/rcon' })
    .use(authGuard)

    .post('/execute', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await squadServer.execute(body.command);

      if (!result.ok) {
        set.status = 400;
        return { error: result.error.message };
      }

      const auditRepo = new AuditRepository(db);
      await auditRepo.insert({
        userId: user!.id,
        action: 'rcon_command',
        details: { command: body.command, response: result.value },
      });

      return {
        command: body.command,
        response: result.value,
        executedAt: new Date().toISOString(),
      };
    }, {
      body: t.Object({
        command: t.String({ minLength: 1 }),
      }),
    })

    .post('/broadcast', async ({ body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await squadServer.broadcast(body.message);

      if (!result.ok) {
        set.status = 400;
        return { error: result.error.message };
      }

      const auditRepo = new AuditRepository(db);
      await auditRepo.insert({
        userId: user!.id,
        action: 'broadcast',
        details: { message: body.message },
      });

      return { ok: true };
    }, {
      body: t.Object({
        message: t.String({ minLength: 1 }),
      }),
    });
}
