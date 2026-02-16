/**
 * @squadscript/server
 *
 * Event broadcaster — forwards server events to connected WebSocket clients.
 *
 * @module
 */

import type { WSServerMessage } from './events.js';
import { broadcastToChannel } from './handler.js';
import type { SquadServer } from '../../server.js';
import type { MetricsCollector } from '../../metrics/collector.js';

/**
 * Wires SquadServer events to WebSocket broadcasts.
 * Call this once after the server is started.
 */
export function setupBroadcaster(
  squadServer: SquadServer,
  metricsCollector: MetricsCollector,
): void {
  // Player events
  const playerEvents = [
    'PLAYER_CONNECTED',
    'PLAYER_DISCONNECTED',
    'PLAYER_JOIN_SUCCEEDED',
  ] as const;

  for (const eventName of playerEvents) {
    squadServer.on(eventName, (event: unknown) => {
      broadcastToChannel('players', {
        type: 'event',
        channel: 'players',
        data: { event: eventName, ...event as Record<string, unknown>, time: new Date().toISOString() },
      });
    });
  }

  // Squad events
  squadServer.on('SQUAD_CREATED', (event: unknown) => {
    broadcastToChannel('squads', {
      type: 'event',
      channel: 'squads',
      data: { event: 'SQUAD_CREATED', ...event as Record<string, unknown>, time: new Date().toISOString() },
    });
  });

  // Chat events
  squadServer.on('CHAT_MESSAGE', (event: unknown) => {
    broadcastToChannel('chat', {
      type: 'event',
      channel: 'chat',
      data: { event: 'CHAT_MESSAGE', ...event as Record<string, unknown>, time: new Date().toISOString() },
    });
  });

  // Combat events
  const combatEvents = [
    'PLAYER_WOUNDED',
    'PLAYER_DIED',
    'PLAYER_REVIVED',
  ] as const;

  for (const eventName of combatEvents) {
    squadServer.on(eventName, (event: unknown) => {
      broadcastToChannel('kills', {
        type: 'event',
        channel: 'kills',
        data: { event: eventName, ...event as Record<string, unknown>, time: new Date().toISOString() },
      });
    });
  }

  // Game events
  const gameEvents = [
    'NEW_GAME',
    'ROUND_ENDED',
    'ROUND_TICKETS',
  ] as const;

  for (const eventName of gameEvents) {
    squadServer.on(eventName, (event: unknown) => {
      broadcastToChannel('game', {
        type: 'event',
        channel: 'game',
        data: { event: eventName, ...event as Record<string, unknown>, time: new Date().toISOString() },
      });
    });
  }

  // Admin events
  const adminEvents = [
    'ADMIN_BROADCAST',
    'PLAYER_KICKED',
    'PLAYER_WARNED',
    'PLAYER_BANNED',
    'ADMIN_CAMERA',
  ] as const;

  for (const eventName of adminEvents) {
    squadServer.on(eventName, (event: unknown) => {
      broadcastToChannel('admin', {
        type: 'event',
        channel: 'admin',
        data: { event: eventName, ...event as Record<string, unknown>, time: new Date().toISOString() },
      });
    });
  }

  // RCON connection events
  squadServer.on('RCON_CONNECTED', (event: unknown) => {
    broadcastToChannel('rcon', {
      type: 'event',
      channel: 'rcon',
      data: { event: 'RCON_CONNECTED', ...event as Record<string, unknown>, time: new Date().toISOString() },
    });
  });

  squadServer.on('RCON_DISCONNECTED', (event: unknown) => {
    broadcastToChannel('rcon', {
      type: 'event',
      channel: 'rcon',
      data: { event: 'RCON_DISCONNECTED', ...event as Record<string, unknown>, time: new Date().toISOString() },
    });
  });

  // Server tick rate — update metrics
  squadServer.on('SERVER_TICK_RATE', (event: unknown) => {
    broadcastToChannel('metrics', {
      type: 'event',
      channel: 'metrics',
      data: { event: 'SERVER_TICK_RATE', ...event as Record<string, unknown>, time: new Date().toISOString() },
    });
  });

  // Periodic metrics push (every 5 seconds)
  setInterval(() => {
    const snapshot = metricsCollector.getCurrentSnapshot();
    broadcastToChannel('metrics', {
      type: 'metrics',
      data: {
        playerCount: snapshot.playerCount,
        tickRate: snapshot.tickRate,
        cpuPercent: snapshot.cpuPercent,
        memoryMb: snapshot.memoryMb,
        publicQueue: snapshot.publicQueue,
        reserveQueue: snapshot.reserveQueue,
        uptime: snapshot.uptime,
        timestamp: snapshot.timestamp.toISOString(),
      },
    } as WSServerMessage);
  }, 5000);
}
