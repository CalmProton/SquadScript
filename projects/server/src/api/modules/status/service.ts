/**
 * @squadscript/server
 *
 * Status service — builds ServerStateSnapshot from SquadServer.
 *
 * @module
 */

import type { ServerStateSnapshot, MetricsSnapshot, PlayerDTO, SquadDTO, LayerDTO, ServerInfoDTO } from '@squadscript/types';

import type { SquadServer } from '../../../server.js';
import type { MetricsCollector } from '../../../metrics/collector.js';

export class StatusService {
  static getSnapshot(
    squadServer: SquadServer,
    metricsCollector: MetricsCollector,
  ): ServerStateSnapshot {
    const serverInfo = squadServer.getServerInfo();
    const currentLayer = squadServer.currentLayer;
    const nextLayer = squadServer.nextLayer;
    const metricsData = metricsCollector.getCurrentSnapshot();

    const info: ServerInfoDTO | null = serverInfo
      ? {
          name: serverInfo.name,
          maxPlayers: serverInfo.maxPlayers,
          playerCount: serverInfo.playerCount,
          publicQueue: serverInfo.publicQueue,
          reserveQueue: serverInfo.reserveQueue,
          currentLayer: serverInfo.currentLayer,
          nextLayer: serverInfo.nextLayer,
          teamOne: serverInfo.teamOne,
          teamTwo: serverInfo.teamTwo,
        }
      : null;

    const currentLayerDTO: LayerDTO | null = currentLayer
      ? {
          name: currentLayer.name,
          level: currentLayer.level,
          gameMode: currentLayer.gameMode,
          version: currentLayer.version,
        }
      : null;

    const nextLayerDTO: LayerDTO | null = nextLayer
      ? {
          name: nextLayer.name,
          level: nextLayer.level,
          gameMode: nextLayer.gameMode,
          version: nextLayer.version,
        }
      : null;

    const players: PlayerDTO[] = squadServer.players.map((p) => ({
      eosId: p.eosID,
      steamId: p.steamID,
      playerId: p.playerID,
      name: p.name,
      teamId: p.teamID,
      squadId: p.squadID,
      squadName: null, // TODO: resolve from squad service
      isSquadLeader: p.isSquadLeader,
      role: p.role,
    }));

    const squads: SquadDTO[] = squadServer.squads.map((s) => ({
      squadId: s.squadID,
      teamId: s.teamID,
      name: s.name,
      size: s.size,
      locked: s.locked,
      creatorName: s.creatorName,
      creatorEosId: s.creatorEOSID,
    }));

    const metrics: MetricsSnapshot = {
      playerCount: metricsData.playerCount,
      tickRate: metricsData.tickRate,
      cpuPercent: metricsData.cpuPercent,
      memoryMb: metricsData.memoryMb,
      publicQueue: metricsData.publicQueue,
      reserveQueue: metricsData.reserveQueue,
      uptime: metricsData.uptime,
      timestamp: metricsData.timestamp.toISOString(),
    };

    const state = squadServer.getState();
    const statusMap: Record<string, ServerStateSnapshot['status']> = {
      created: 'offline',
      starting: 'starting',
      running: 'online',
      stopping: 'stopping',
      stopped: 'offline',
      error: 'offline',
    };

    return {
      status: statusMap[state] ?? 'offline',
      info,
      currentLayer: currentLayerDTO,
      nextLayer: nextLayerDTO,
      players,
      squads,
      metrics,
      uptime: metricsCollector.getUptime(),
      rconConnected: squadServer.isRunning(),
    };
  }
}
