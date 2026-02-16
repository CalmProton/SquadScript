/**
 * @squadscript/server
 *
 * Squads controller — /api/squads/*
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { SquadServer } from '../../../server.js';
import type { DrizzleDB } from '../../../db/index.js';
import { authGuard, checkAuth, checkRole } from '../../plugins/auth.js';

export function createSquadsModule(squadServer: SquadServer, db: DrizzleDB) {
  return new Elysia({ prefix: '/squads' })
    .use(authGuard)

    .get('/', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      return squadServer.squads.map((s) => ({
        squadId: s.squadID,
        teamId: s.teamID,
        name: s.name,
        size: s.size,
        locked: s.locked,
        creatorName: s.creatorName,
        creatorEosId: s.creatorEOSID,
      }));
    })

    .post('/:teamId/:squadId/disband', async ({ params, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const command = `AdminDisbandSquad ${params.teamId} ${params.squadId}`;
      const result = await squadServer.execute(command);

      if (!result.ok) {
        set.status = 400;
        return { error: result.error.message };
      }

      const { AuditRepository } = await import('../../../db/repositories/audit.repo.js');
      const auditRepo = new AuditRepository(db);
      await auditRepo.insert({
        userId: user!.id,
        action: 'squad_disband',
        target: `${params.teamId}/${params.squadId}`,
      });

      return { ok: true };
    });
}
