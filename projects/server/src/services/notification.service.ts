/**
 * @squadscript/server
 *
 * NotificationService — creates dashboard notifications on critical events
 * and broadcasts them to connected WebSocket clients.
 *
 * @module
 */

import { EventType } from '@squadscript/types/events';
import type {
  RconDisconnectedEvent,
  RconErrorEvent,
  PlayerBannedEvent,
  PlayerKickedEvent,
  RoundEndedEvent,
  NewGameEvent,
} from '@squadscript/types/events';

import type { SquadServer } from '../server.js';
import { NotificationRepository } from '../db/repositories/notification.repo.js';
import { broadcastToChannel } from '../api/websocket/handler.js';
import type { DrizzleDB } from '../db/index.js';

export interface NotificationData {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
}

/**
 * Listens for critical server events and creates persistent notifications
 * in the database, then broadcasts them to WebSocket clients.
 */
export class NotificationService {
  private readonly repo: NotificationRepository;
  private readonly serverId: string;

  constructor(
    private readonly squadServer: SquadServer,
    db: DrizzleDB,
    serverId?: string,
  ) {
    this.repo = new NotificationRepository(db);
    this.serverId = serverId ?? squadServer.id;
  }

  /** Subscribe to critical events. */
  start(): void {
    this.squadServer.on(EventType.RCON_DISCONNECTED, (e) =>
      void this.onRconDisconnected(e),
    );
    this.squadServer.on(EventType.RCON_ERROR, (e) =>
      void this.onRconError(e),
    );
    this.squadServer.on(EventType.PLAYER_BANNED, (e) =>
      void this.onPlayerBanned(e),
    );
    this.squadServer.on(EventType.PLAYER_KICKED, (e) =>
      void this.onPlayerKicked(e),
    );
    this.squadServer.on(EventType.ROUND_ENDED, (e) =>
      void this.onRoundEnded(e),
    );
    this.squadServer.on(EventType.NEW_GAME, (e) =>
      void this.onNewGame(e),
    );
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  private async onRconDisconnected(event: RconDisconnectedEvent) {
    await this.create({
      type: 'rcon',
      severity: 'error',
      title: 'RCON Disconnected',
      message: `RCON connection lost: ${event.reason}. ${event.willReconnect ? 'Reconnecting...' : 'No automatic reconnection.'}`,
    });
  }

  private async onRconError(event: RconErrorEvent) {
    if (!event.fatal) return;
    await this.create({
      type: 'rcon',
      severity: 'error',
      title: 'RCON Error',
      message: `Fatal RCON error: ${event.error.message}`,
    });
  }

  private async onPlayerBanned(event: PlayerBannedEvent) {
    const duration = event.duration === 0 ? 'permanently' : `for ${event.duration}s`;
    await this.create({
      type: 'admin',
      severity: 'warning',
      title: 'Player Banned',
      message: `${event.name} was banned ${duration}: ${event.reason}`,
    });
  }

  private async onPlayerKicked(event: PlayerKickedEvent) {
    await this.create({
      type: 'admin',
      severity: 'info',
      title: 'Player Kicked',
      message: `${event.player.name} was kicked: ${event.reason}`,
    });
  }

  private async onRoundEnded(event: RoundEndedEvent) {
    const winner = event.winner ? `Team ${event.winner}` : 'Draw';
    await this.create({
      type: 'game',
      severity: 'info',
      title: 'Round Ended',
      message: `${winner} won (${event.team1Tickets} vs ${event.team2Tickets}), duration: ${Math.round(event.durationSeconds / 60)} min`,
    });
  }

  private async onNewGame(event: NewGameEvent) {
    await this.create({
      type: 'game',
      severity: 'success',
      title: 'New Game Started',
      message: `Map: ${event.level}, Layer: ${event.layerName}`,
    });
  }

  // ─── Persistence & Broadcast ────────────────────────────────────────────

  private async create(data: NotificationData): Promise<void> {
    try {
      const record = await this.repo.insert({
        ...data,
        serverId: this.serverId,
      });

      // Broadcast to WebSocket clients
      broadcastToChannel('notifications', {
        type: 'notification',
        data: {
          id: record.id,
          type: record.type,
          severity: record.severity as 'info' | 'warning' | 'error' | 'critical',
          title: record.title,
          message: record.message,
          read: record.read,
          createdAt: record.createdAt.toISOString(),
        },
      });
    } catch {
      // Intentionally swallow — notification failures should never crash the server
    }
  }
}
