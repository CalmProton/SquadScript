/**
 * @squadscript/types
 *
 * WebSocket message types for real-time communication.
 *
 * @module
 */

import type { ServerStateSnapshot, MetricsSnapshot, NotificationDTO } from './responses.js';

// =============================================================================
// WebSocket Channels
// =============================================================================

export type WSChannel =
  | 'players'
  | 'squads'
  | 'chat'
  | 'kills'
  | 'game'
  | 'admin'
  | 'rcon'
  | 'metrics'
  | 'plugins'
  | 'logs'
  | 'notifications';

// =============================================================================
// Client → Server Messages
// =============================================================================

export type WSClientMessage =
  | { readonly type: 'subscribe'; readonly channels: readonly WSChannel[] }
  | { readonly type: 'unsubscribe'; readonly channels: readonly WSChannel[] }
  | { readonly type: 'ping' };

// =============================================================================
// Server → Client Messages
// =============================================================================

export type WSServerMessage =
  | { readonly type: 'state'; readonly data: ServerStateSnapshot }
  | { readonly type: 'event'; readonly channel: WSChannel; readonly data: unknown }
  | { readonly type: 'metrics'; readonly data: MetricsSnapshot }
  | { readonly type: 'notification'; readonly data: NotificationDTO }
  | { readonly type: 'pong' }
  | { readonly type: 'error'; readonly message: string };

// =============================================================================
// Event Payload Types
// =============================================================================

export interface WSPlayerEvent {
  readonly event: string;
  readonly player: {
    readonly eosId: string;
    readonly steamId: string | null;
    readonly name: string;
    readonly teamId: number | null;
    readonly squadId: number | null;
  };
  readonly time: string;
}

export interface WSChatEvent {
  readonly event: 'CHAT_MESSAGE';
  readonly playerName: string;
  readonly playerEosId: string;
  readonly channel: string;
  readonly message: string;
  readonly time: string;
}

export interface WSKillEvent {
  readonly event: string;
  readonly attacker: string | null;
  readonly victim: string;
  readonly weapon: string | null;
  readonly time: string;
}

export interface WSGameEvent {
  readonly event: string;
  readonly data: Record<string, unknown>;
  readonly time: string;
}

export interface WSAdminEvent {
  readonly event: string;
  readonly admin: string | null;
  readonly target: string | null;
  readonly reason: string | null;
  readonly time: string;
}

export interface WSPluginEvent {
  readonly event: 'PLUGIN_STATE_CHANGED';
  readonly name: string;
  readonly state: string;
  readonly enabled: boolean;
}

export interface WSLogEvent {
  readonly id: number;
  readonly type: string;
  readonly message: string;
  readonly player: string | null;
  readonly time: string;
}
