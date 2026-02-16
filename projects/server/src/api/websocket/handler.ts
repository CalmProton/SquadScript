/**
 * @squadscript/server
 *
 * WebSocket connection handler — manages connections, subscriptions, and channels.
 *
 * @module
 */

import { Elysia } from 'elysia';

import type { SquadServer } from '../../server.js';
import type { MetricsCollector } from '../../metrics/collector.js';
import { AuthService, type JWTPayload } from '../modules/auth/service.js';
import { StatusService } from '../modules/status/service.js';
import type { WSChannel, WSClientMessage, WSServerMessage } from './events.js';

interface WSClient {
  readonly user: JWTPayload;
  readonly channels: Set<WSChannel>;
  readonly ws: {
    send: (data: string) => void;
    close: () => void;
  };
}

/** Global set of connected WebSocket clients. */
const clients = new Map<object, WSClient>();

/**
 * Get all connected clients (for the broadcaster to use).
 */
export function getConnectedClients(): ReadonlyMap<object, WSClient> {
  return clients;
}

/**
 * Send a message to all clients subscribed to a specific channel.
 */
export function broadcastToChannel(channel: WSChannel, message: WSServerMessage): void {
  const payload = JSON.stringify(message);

  for (const client of clients.values()) {
    if (client.channels.has(channel)) {
      try {
        client.ws.send(payload);
      } catch {
        // Client disconnected — will be cleaned up
      }
    }
  }
}

/**
 * Send a message to all connected clients.
 */
export function broadcastToAll(message: WSServerMessage): void {
  const payload = JSON.stringify(message);

  for (const client of clients.values()) {
    try {
      client.ws.send(payload);
    } catch {
      // Client disconnected
    }
  }
}

/**
 * Creates the ElysiaJS WebSocket handler plugin.
 * Receives server and metrics via closure for the initial state snapshot.
 */
export function createWsHandler(squadServer: SquadServer, metricsCollector: MetricsCollector) {
  return new Elysia()
    .ws('/ws', {
      open(ws) {
        // Extract token from query string
        const url = new URL(ws.data.request.url);
        const token = url.searchParams.get('token');

        if (!token) {
          ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
          ws.close();
          return;
        }

        const user = AuthService.verifyJWT(token);
        if (!user) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
          ws.close();
          return;
        }

        // Register client with default channels
        const client: WSClient = {
          user,
          channels: new Set<WSChannel>(['players', 'metrics', 'game']),
          ws: {
            send: (data: string) => ws.send(data),
            close: () => ws.close(),
          },
        };

        clients.set(ws, client);

        // Send initial state snapshot
        try {
          const state = StatusService.getSnapshot(squadServer, metricsCollector);
          ws.send(JSON.stringify({ type: 'state', data: state } satisfies WSServerMessage));
        } catch {
          // Non-fatal — state may not be ready yet
        }
      },

      message(ws, rawMessage) {
        const client = clients.get(ws);
        if (!client) return;

        try {
          const message = (typeof rawMessage === 'string'
            ? JSON.parse(rawMessage)
            : rawMessage) as WSClientMessage;

          switch (message.type) {
            case 'subscribe':
              for (const channel of message.channels) {
                client.channels.add(channel);
              }
              break;

            case 'unsubscribe':
              for (const channel of message.channels) {
                client.channels.delete(channel);
              }
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' } satisfies WSServerMessage));
              break;
          }
        } catch {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          } satisfies WSServerMessage));
        }
      },

      close(ws) {
        clients.delete(ws);
      },
    });
}
