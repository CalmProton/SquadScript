/**
 * @squadscript/server
 *
 * EventLogService — subscribes to SquadServer events and persists
 * structured log entries to the event_log table.
 *
 * @module
 */

import { EventType } from '@squadscript/types/events';
import type {
  PlayerConnectedEvent,
  PlayerDisconnectedEvent,
  PlayerDiedEvent,
  PlayerWoundedEvent,
  PlayerRevivedEvent,
  ChatMessageEvent,
  NewGameEvent,
  RoundEndedEvent,
  AdminBroadcastEvent,
  PlayerKickedEvent,
  PlayerWarnedEvent,
  PlayerBannedEvent,
  SquadCreatedEvent,
  RconConnectedEvent,
  RconDisconnectedEvent,
} from '@squadscript/types/events';

import type { SquadServer } from '../server.js';
import { EventLogRepository } from '../db/repositories/event-log.repo.js';
import type { DrizzleDB } from '../db/index.js';

/**
 * Persists server events to the event_log database table.
 *
 * Each event is mapped to a human-readable message with the original
 * event payload captured in the `details` JSONB column.
 */
export class EventLogService {
  private readonly repo: EventLogRepository;
  private readonly serverId: string;

  constructor(
    private readonly squadServer: SquadServer,
    db: DrizzleDB,
    serverId?: string,
  ) {
    this.repo = new EventLogRepository(db);
    this.serverId = serverId ?? squadServer.id;
  }

  /** Subscribe to all relevant SquadServer events. */
  start(): void {
    this.squadServer.on(EventType.PLAYER_CONNECTED, (e) =>
      void this.onPlayerConnected(e),
    );
    this.squadServer.on(EventType.PLAYER_DISCONNECTED, (e) =>
      void this.onPlayerDisconnected(e),
    );
    this.squadServer.on(EventType.PLAYER_DIED, (e) =>
      void this.onPlayerDied(e),
    );
    this.squadServer.on(EventType.PLAYER_WOUNDED, (e) =>
      void this.onPlayerWounded(e),
    );
    this.squadServer.on(EventType.PLAYER_REVIVED, (e) =>
      void this.onPlayerRevived(e),
    );
    this.squadServer.on(EventType.CHAT_MESSAGE, (e) =>
      void this.onChatMessage(e),
    );
    this.squadServer.on(EventType.NEW_GAME, (e) =>
      void this.onNewGame(e),
    );
    this.squadServer.on(EventType.ROUND_ENDED, (e) =>
      void this.onRoundEnded(e),
    );
    this.squadServer.on(EventType.ADMIN_BROADCAST, (e) =>
      void this.onAdminBroadcast(e),
    );
    this.squadServer.on(EventType.PLAYER_KICKED, (e) =>
      void this.onPlayerKicked(e),
    );
    this.squadServer.on(EventType.PLAYER_WARNED, (e) =>
      void this.onPlayerWarned(e),
    );
    this.squadServer.on(EventType.PLAYER_BANNED, (e) =>
      void this.onPlayerBanned(e),
    );
    this.squadServer.on(EventType.SQUAD_CREATED, (e) =>
      void this.onSquadCreated(e),
    );
    this.squadServer.on(EventType.RCON_CONNECTED, (e) =>
      void this.onRconConnected(e),
    );
    this.squadServer.on(EventType.RCON_DISCONNECTED, (e) =>
      void this.onRconDisconnected(e),
    );
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  private async onPlayerConnected(event: PlayerConnectedEvent) {
    await this.persist({
      type: EventType.PLAYER_CONNECTED,
      message: `${event.player.name} connected`,
      player: event.player.name,
      playerEos: event.player.eosID,
      details: { ip: event.ip },
    });
  }

  private async onPlayerDisconnected(event: PlayerDisconnectedEvent) {
    await this.persist({
      type: EventType.PLAYER_DISCONNECTED,
      message: `${event.player.name} disconnected`,
      player: event.player.name,
      playerEos: event.player.eosID,
    });
  }

  private async onPlayerDied(event: PlayerDiedEvent) {
    const attackerName = event.attacker?.name ?? 'unknown';
    const message = event.suicide
      ? `${event.victim.name} committed suicide`
      : `${event.victim.name} was killed by ${attackerName} (${event.weapon ?? 'unknown'})`;
    await this.persist({
      type: EventType.PLAYER_DIED,
      message,
      player: event.victim.name,
      playerEos: event.victim.eosID,
      details: {
        attacker: event.attacker?.name ?? null,
        attackerEos: event.attacker?.eosID ?? null,
        weapon: event.weapon,
        damage: event.damage,
        teamkill: !event.suicide && event.attacker?.teamID === event.victim.teamID,
      },
    });
  }

  private async onPlayerWounded(event: PlayerWoundedEvent) {
    const attackerName = event.attacker?.name ?? 'unknown';
    await this.persist({
      type: EventType.PLAYER_WOUNDED,
      message: `${event.victim.name} was wounded by ${attackerName} (${event.weapon})`,
      player: event.victim.name,
      playerEos: event.victim.eosID,
      details: {
        attacker: event.attacker?.name ?? null,
        attackerEos: event.attacker?.eosID ?? null,
        weapon: event.weapon,
        damage: event.damage,
        teamkill: event.teamkill,
      },
    });
  }

  private async onPlayerRevived(event: PlayerRevivedEvent) {
    await this.persist({
      type: EventType.PLAYER_REVIVED,
      message: `${event.victim.name} was revived by ${event.reviver.name}`,
      player: event.victim.name,
      playerEos: event.victim.eosID,
      details: {
        reviver: event.reviver.name,
        reviverEos: event.reviver.eosID,
      },
    });
  }

  private async onChatMessage(event: ChatMessageEvent) {
    await this.persist({
      type: EventType.CHAT_MESSAGE,
      message: `[${event.channel}] ${event.player.name}: ${event.message}`,
      player: event.player.name,
      playerEos: event.player.eosID,
      details: { channel: event.channel, content: event.message },
    });
  }

  private async onNewGame(event: NewGameEvent) {
    await this.persist({
      type: EventType.NEW_GAME,
      message: `New game started: ${event.layerName} on ${event.level}`,
      details: {
        level: event.level,
        layerName: event.layerName,
        isFirstGame: event.isFirstGame,
      },
    });
  }

  private async onRoundEnded(event: RoundEndedEvent) {
    const winner = event.winner ? `Team ${event.winner}` : 'Draw';
    await this.persist({
      type: EventType.ROUND_ENDED,
      message: `Round ended — ${winner} (${event.team1Tickets} vs ${event.team2Tickets}), ${Math.round(event.durationSeconds / 60)} min`,
      details: {
        winner: event.winner,
        team1Tickets: event.team1Tickets,
        team2Tickets: event.team2Tickets,
        durationSeconds: event.durationSeconds,
      },
    });
  }

  private async onAdminBroadcast(event: AdminBroadcastEvent) {
    await this.persist({
      type: EventType.ADMIN_BROADCAST,
      message: `Admin broadcast: ${event.message}`,
      details: { duration: event.duration },
    });
  }

  private async onPlayerKicked(event: PlayerKickedEvent) {
    await this.persist({
      type: EventType.PLAYER_KICKED,
      message: `${event.player.name} was kicked: ${event.reason}`,
      player: event.player.name,
      playerEos: event.player.eosID,
      details: {
        reason: event.reason,
        admin: event.admin?.name ?? null,
      },
    });
  }

  private async onPlayerWarned(event: PlayerWarnedEvent) {
    await this.persist({
      type: EventType.PLAYER_WARNED,
      message: `${event.player.name} was warned: ${event.message}`,
      player: event.player.name,
      playerEos: event.player.eosID,
      details: {
        warningMessage: event.message,
        admin: event.admin?.name ?? null,
      },
    });
  }

  private async onPlayerBanned(event: PlayerBannedEvent) {
    const duration = event.duration === 0 ? 'permanently' : `for ${event.duration}s`;
    await this.persist({
      type: EventType.PLAYER_BANNED,
      message: `${event.name} was banned ${duration}: ${event.reason}`,
      player: event.name,
      playerEos: event.eosID ?? undefined,
      details: {
        steamId: event.steamID,
        eosId: event.eosID,
        reason: event.reason,
        duration: event.duration,
        admin: event.admin?.name ?? null,
      },
    });
  }

  private async onSquadCreated(event: SquadCreatedEvent) {
    await this.persist({
      type: EventType.SQUAD_CREATED,
      message: `${event.player.name} created Squad ${event.squadID} "${event.squadName}" on Team ${event.teamID}`,
      player: event.player.name,
      playerEos: event.player.eosID,
      details: {
        squadId: event.squadID,
        squadName: event.squadName,
        teamId: event.teamID,
      },
    });
  }

  private async onRconConnected(event: RconConnectedEvent) {
    await this.persist({
      type: EventType.RCON_CONNECTED,
      message: `RCON connected to ${event.host}:${event.port}${event.reconnect ? ' (reconnect)' : ''}`,
      details: {
        host: event.host,
        port: event.port,
        reconnect: event.reconnect,
      },
    });
  }

  private async onRconDisconnected(event: RconDisconnectedEvent) {
    await this.persist({
      type: EventType.RCON_DISCONNECTED,
      message: `RCON disconnected: ${event.reason}`,
      details: {
        reason: event.reason,
        willReconnect: event.willReconnect,
      },
    });
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  private async persist(entry: {
    type: string;
    message: string;
    player?: string | undefined;
    playerEos?: string | null | undefined;
    details?: Record<string, unknown> | null | undefined;
  }): Promise<void> {
    try {
      await this.repo.insert({
        type: entry.type,
        message: entry.message,
        serverId: this.serverId,
        player: entry.player ?? null,
        playerEos: entry.playerEos ?? null,
        details: entry.details ?? null,
      });
    } catch {
      // Intentionally swallow — event logging should never crash the server
    }
  }
}
