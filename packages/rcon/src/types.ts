/**
 * @squadscript/rcon
 *
 * Type definitions for RCON configuration and data structures.
 *
 * @module
 */

import type { SteamID, EOSID, PlayerID, TeamID, SquadID } from '@squadscript/types';
import type { ChatChannel, ConnectionState } from './constants.js';

// Re-export for convenience
export type { ConnectionState };
export type { ChatChannel };

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * RCON client configuration options.
 */
export interface RconConfig {
  /** Server hostname or IP address. */
  readonly host: string;

  /** RCON port number (default: 21114 for Squad). */
  readonly port: number;

  /** RCON password. */
  readonly password: string;

  /** Reconnection behavior configuration. */
  readonly reconnect?: ReconnectConfig;

  /** Command execution configuration. */
  readonly command?: CommandConfig;

  /** Heartbeat/keepalive configuration. */
  readonly heartbeat?: HeartbeatConfig;

  /** Connection timeout in milliseconds. */
  readonly connectTimeout?: number;
}

/**
 * Reconnection behavior configuration.
 */
export interface ReconnectConfig {
  /** Enable automatic reconnection (default: true). */
  readonly enabled?: boolean;

  /** Initial delay before first reconnection attempt in ms (default: 1000). */
  readonly initialDelay?: number;

  /** Maximum delay between reconnection attempts in ms (default: 30000). */
  readonly maxDelay?: number;

  /** Backoff multiplier for exponential delay (default: 2). */
  readonly multiplier?: number;

  /** Random jitter factor 0-1 to prevent thundering herd (default: 0.1). */
  readonly jitter?: number;

  /** Maximum number of reconnection attempts, 0 = unlimited (default: 0). */
  readonly maxAttempts?: number;
}

/**
 * Command execution configuration.
 */
export interface CommandConfig {
  /** Command response timeout in ms (default: 10000). */
  readonly timeout?: number;

  /** Number of retries for timed out commands (default: 1). */
  readonly retries?: number;
}

/**
 * Heartbeat/keepalive configuration.
 */
export interface HeartbeatConfig {
  /** Enable heartbeat (default: true). */
  readonly enabled?: boolean;

  /** Heartbeat interval in ms (default: 30000). */
  readonly interval?: number;

  /** Command to use for heartbeat (default: ''). */
  readonly command?: string;
}

/**
 * Resolved configuration with all defaults applied.
 */
export interface ResolvedRconConfig {
  readonly host: string;
  readonly port: number;
  readonly password: string;
  readonly connectTimeout: number;
  readonly reconnect: Required<ReconnectConfig>;
  readonly command: Required<CommandConfig>;
  readonly heartbeat: Required<HeartbeatConfig>;
}

// =============================================================================
// Player Types
// =============================================================================

/**
 * Player identifier that can be used in admin commands.
 *
 * Admin commands accept various player identifiers:
 * - SteamID (17 digits)
 * - EOSID (32 hex characters)
 * - PlayerID (in-game session ID)
 * - Player name (string)
 */
export type AnyPlayerID = SteamID | EOSID | PlayerID | string;

/**
 * Player information from ListPlayers command.
 */
export interface PlayerInfo {
  /** In-game player ID (0-100). */
  readonly playerID: PlayerID;

  /** Player's Steam ID (null if not available). */
  readonly steamID: SteamID | null;

  /** Player's EOS ID. */
  readonly eosID: EOSID;

  /** Player's display name. */
  readonly name: string;

  /** Team ID (1 or 2, null if not on a team). */
  readonly teamID: TeamID | null;

  /** Squad ID (null if not in a squad). */
  readonly squadID: SquadID | null;

  /** Whether the player is a squad leader. */
  readonly isLeader: boolean;

  /** Player's current role/kit. */
  readonly role: string;
}

/**
 * Squad information from ListSquads command.
 */
export interface SquadInfo {
  /** Squad ID number. */
  readonly squadID: SquadID;

  /** Team ID (1 or 2). */
  readonly teamID: TeamID;

  /** Squad name. */
  readonly name: string;

  /** Current squad size (number of members). */
  readonly size: number;

  /** Whether the squad is locked. */
  readonly locked: boolean;

  /** Squad creator's name. */
  readonly creatorName: string;

  /** Squad creator's Steam ID (if available). */
  readonly creatorSteamID: SteamID | null;

  /** Squad creator's EOS ID. */
  readonly creatorEOSID: EOSID;

  /** Team name (faction name). */
  readonly teamName: string;
}

/**
 * Map/layer information.
 */
export interface MapInfo {
  /** Map/level name (e.g., "Narva"). */
  readonly level: string | null;

  /** Layer name (e.g., "Narva_RAAS_v1"). */
  readonly layer: string | null;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Base interface for all RCON events.
 */
interface BaseRconEvent {
  /** Raw packet body for debugging. */
  readonly raw: string;

  /** Timestamp when the event was received. */
  readonly timestamp: Date;
}

/**
 * Player identifier fields for events.
 */
interface PlayerIdentifiers {
  /** Player's Steam ID (null if not available). */
  readonly steamID: SteamID | null;

  /** Player's EOS ID. */
  readonly eosID: EOSID;
}

/**
 * Chat message event from RCON.
 */
export interface RconChatMessageEvent extends BaseRconEvent, PlayerIdentifiers {
  /** The chat channel. */
  readonly channel: ChatChannel;

  /** Player's display name. */
  readonly playerName: string;

  /** The chat message content. */
  readonly message: string;
}

/**
 * Admin camera possessed event.
 */
export interface RconAdminCamPossessedEvent extends BaseRconEvent, PlayerIdentifiers {
  /** Player's display name. */
  readonly playerName: string;
}

/**
 * Admin camera unpossessed event.
 */
export interface RconAdminCamUnpossessedEvent extends BaseRconEvent, PlayerIdentifiers {
  /** Player's display name. */
  readonly playerName: string;
}

/**
 * Player warned event.
 */
export interface RconPlayerWarnedEvent extends BaseRconEvent {
  /** Warned player's name. */
  readonly playerName: string;

  /** Warning message/reason. */
  readonly reason: string;
}

/**
 * Player kicked event.
 */
export interface RconPlayerKickedEvent extends BaseRconEvent, PlayerIdentifiers {
  /** In-game player ID. */
  readonly playerID: PlayerID;

  /** Player's display name. */
  readonly playerName: string;
}

/**
 * Player banned event.
 */
export interface RconPlayerBannedEvent extends BaseRconEvent, PlayerIdentifiers {
  /** In-game player ID. */
  readonly playerID: PlayerID;

  /** Player's display name. */
  readonly playerName: string;

  /** Ban interval (e.g., "permanent", "1d", "1h"). */
  readonly interval: string;
}

/**
 * Squad created event.
 */
export interface RconSquadCreatedEvent extends BaseRconEvent, PlayerIdentifiers {
  /** Creator's display name. */
  readonly playerName: string;

  /** Squad ID. */
  readonly squadID: SquadID;

  /** Squad name. */
  readonly squadName: string;

  /** Team name (faction). */
  readonly teamName: string;
}

/**
 * Union of all RCON events.
 */
export type RconEvent =
  | RconChatMessageEvent
  | RconAdminCamPossessedEvent
  | RconAdminCamUnpossessedEvent
  | RconPlayerWarnedEvent
  | RconPlayerKickedEvent
  | RconPlayerBannedEvent
  | RconSquadCreatedEvent;

// =============================================================================
// Event Map
// =============================================================================

/**
 * Map of RCON event names to their event types.
 */
export interface RconEventMap {
  /** Chat message received. */
  CHAT_MESSAGE: RconChatMessageEvent;

  /** Player entered admin camera. */
  ADMIN_CAM_ENTERED: RconAdminCamPossessedEvent;

  /** Player exited admin camera. */
  ADMIN_CAM_EXITED: RconAdminCamUnpossessedEvent;

  /** Player was warned. */
  PLAYER_WARNED: RconPlayerWarnedEvent;

  /** Player was kicked. */
  PLAYER_KICKED: RconPlayerKickedEvent;

  /** Player was banned. */
  PLAYER_BANNED: RconPlayerBannedEvent;

  /** Squad was created. */
  SQUAD_CREATED: RconSquadCreatedEvent;
}

/**
 * RCON event type names.
 */
export type RconEventType = keyof RconEventMap;

// =============================================================================
// Connection Event Map
// =============================================================================

/**
 * Connection lifecycle events.
 */
export interface ConnectionEventMap {
  /** Successfully connected and authenticated. */
  connected: void;

  /** Disconnected from server. */
  disconnected: { reason: string };

  /** Attempting to reconnect. */
  reconnecting: { attempt: number; delay: number };

  /** Reconnection succeeded. */
  reconnected: { attempts: number };

  /** Reconnection failed (max attempts reached). */
  reconnect_failed: { attempts: number };

  /** Any error occurred. */
  error: Error;
}

/**
 * Combined event map for all events.
 */
export type AllEventMap = RconEventMap & ConnectionEventMap;

// =============================================================================
// Pending Command
// =============================================================================

/**
 * Represents a pending command waiting for response.
 */
export interface PendingCommand {
  /** Command sequence number. */
  readonly sequence: number;

  /** The command string. */
  readonly command: string;

  /** When the command was sent. */
  readonly sentAt: number;

  /** Resolve the promise with response body. */
  resolve: (response: string) => void;

  /** Reject the promise with an error. */
  reject: (error: Error) => void;

  /** Timeout timer. */
  timeoutTimer?: ReturnType<typeof setTimeout>;

  /** Accumulated response packets. */
  responsePackets: string[];
}
