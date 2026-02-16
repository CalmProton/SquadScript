/**
 * @squadscript/server
 *
 * Player service — player actions via RCON.
 *
 * @module
 */

import type { PlayerDTO } from '@squadscript/types';

import type { SquadServer } from '../../../server.js';
import type { DrizzleDB } from '../../../db/index.js';
import { AuditRepository } from '../../../db/repositories/audit.repo.js';
import { BanRepository } from '../../../db/repositories/ban.repo.js';
import type { JWTPayload } from '../auth/service.js';

export class PlayerService {
  static getAll(squadServer: SquadServer): PlayerDTO[] {
    return squadServer.players.map((p) => ({
      eosId: p.eosID,
      steamId: p.steamID,
      playerId: p.playerID,
      name: p.name,
      teamId: p.teamID,
      squadId: p.squadID,
      squadName: null,
      isSquadLeader: p.isSquadLeader,
      role: p.role,
    }));
  }

  static getByEosId(squadServer: SquadServer, eosId: string): PlayerDTO | null {
    const player = squadServer.players.find((p) => p.eosID === eosId);
    if (!player) return null;

    return {
      eosId: player.eosID,
      steamId: player.steamID,
      playerId: player.playerID,
      name: player.name,
      teamId: player.teamID,
      squadId: player.squadID,
      squadName: null,
      isSquadLeader: player.isSquadLeader,
      role: player.role,
    };
  }

  static async warn(
    squadServer: SquadServer,
    db: DrizzleDB,
    eosId: string,
    message: string,
    user: JWTPayload,
  ) {
    const result = await squadServer.warn(eosId, message);
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }

    const auditRepo = new AuditRepository(db);
    await auditRepo.insert({
      userId: user.id,
      action: 'warn',
      target: eosId,
      details: { message },
    });

    return { ok: true };
  }

  static async kick(
    squadServer: SquadServer,
    db: DrizzleDB,
    eosId: string,
    reason: string,
    user: JWTPayload,
  ) {
    const result = await squadServer.kick(eosId, reason);
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }

    const auditRepo = new AuditRepository(db);
    await auditRepo.insert({
      userId: user.id,
      action: 'kick',
      target: eosId,
      details: { reason },
    });

    return { ok: true };
  }

  static async ban(
    squadServer: SquadServer,
    db: DrizzleDB,
    eosId: string,
    duration: number,
    reason: string,
    user: JWTPayload,
  ) {
    const result = await squadServer.ban(eosId, duration, reason);
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }

    // Persist ban to history
    const banRepo = new BanRepository(db);
    const player = squadServer.players.find((p) => p.eosID === eosId);
    await banRepo.insert({
      eosId,
      steamId: player?.steamID ?? null,
      name: player?.name ?? null,
      reason,
      duration,
      adminId: user.id,
      adminName: user.username,
      expiresAt: duration > 0 ? new Date(Date.now() + duration * 1000) : null,
    });

    // Also audit
    const auditRepo = new AuditRepository(db);
    await auditRepo.insert({
      userId: user.id,
      action: 'ban',
      target: eosId,
      details: { duration, reason },
    });

    return { ok: true };
  }
}
