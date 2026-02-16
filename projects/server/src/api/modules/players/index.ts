/**
 * @squadscript/server
 *
 * Players controller — /api/players/*
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { SquadServer } from '../../../server.js';
import type { DrizzleDB } from '../../../db/index.js';
import { authGuard, checkAuth, checkRole } from '../../plugins/auth.js';
import { PlayerService } from './service.js';
import { PlayerModel } from './model.js';

export function createPlayersModule(squadServer: SquadServer, db: DrizzleDB) {
  return new Elysia({ prefix: '/players' })
    .use(authGuard)

    .get('/', ({ user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      return PlayerService.getAll(squadServer);
    })

    .get('/:eosId', ({ params: { eosId }, user, set }) => {
      const denied = checkAuth(user, set);
      if (denied) return denied;
      const player = PlayerService.getByEosId(squadServer, eosId);
      if (!player) {
        set.status = 404;
        return { error: 'Player not found' };
      }
      return player;
    })

    .post('/:eosId/warn', async ({ params: { eosId }, body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await PlayerService.warn(squadServer, db, eosId, body.message, user!);
      if (!result.ok) {
        set.status = 400;
        return { error: result.error };
      }
      return result;
    }, {
      body: PlayerModel.warnBody,
    })

    .post('/:eosId/kick', async ({ params: { eosId }, body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await PlayerService.kick(squadServer, db, eosId, body.reason, user!);
      if (!result.ok) {
        set.status = 400;
        return { error: result.error };
      }
      return result;
    }, {
      body: PlayerModel.kickBody,
    })

    .post('/:eosId/ban', async ({ params: { eosId }, body, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await PlayerService.ban(
        squadServer, db, eosId, body.duration, body.reason, user!,
      );
      if (!result.ok) {
        set.status = 400;
        return { error: result.error };
      }
      return result;
    }, {
      body: PlayerModel.banBody,
    })

    .post('/:eosId/force-team-change', async ({ params: { eosId }, user, set }) => {
      const denied = checkRole(user, 'admin', set);
      if (denied) return denied;
      const result = await squadServer.execute(`AdminForceTeamChange ${eosId}`);
      if (!result.ok) {
        set.status = 400;
        return { error: result.error.message };
      }

      const { AuditRepository } = await import('../../../db/repositories/audit.repo.js');
      const auditRepo = new AuditRepository(db);
      await auditRepo.insert({
        userId: user!.id,
        action: 'force_team_change',
        target: eosId,
      });

      return { ok: true };
    });
}
