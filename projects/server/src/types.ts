/**
 * @squadscript/server
 *
 * Core type definitions for SquadServer.
 *
 * @module
 */

import type {
  Player,
  Squad,
  Layer,
  EOSID,
  SteamID,
  TeamID,
  SquadID,
  SquadEventMap,
} from '@squadscript/types';

// =============================================================================
// Server State Enums
// =============================================================================

/**
 * Server lifecycle states.
 */
export const ServerState = {
  /** Initial state before connect() is called. */
  CREATED: 'created',
  /** Connecting to RCON and log sources. */
  STARTING: 'starting',
  /** Connected and running. */
  RUNNING: 'running',
  /** Shutting down gracefully. */
  STOPPING: 'stopping',
  /** Stopped and cleaned up. */
  STOPPED: 'stopped',
  /** Error state - manual recovery needed. */
  ERROR: 'error',
} as const;

export type ServerState = (typeof ServerState)[keyof typeof ServerState];

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Update intervals configuration in milliseconds.
 */
export interface UpdateIntervals {
  /** Interval for refreshing player list (default: 30000). */
  readonly playerList: number;
  /** Interval for refreshing squad list (default: 30000). */
  readonly squadList: number;
  /** Interval for refreshing layer info (default: 30000). */
  readonly layerInfo: number;
  /** Interval for refreshing server info (default: 30000). */
  readonly serverInfo: number;
  /** Interval for refreshing admin list (default: 300000). */
  readonly adminList: number;
}

/**
 * Default update intervals.
 */
export const DEFAULT_UPDATE_INTERVALS: UpdateIntervals = {
  playerList: 30_000,
  squadList: 30_000,
  layerInfo: 30_000,
  serverInfo: 30_000,
  adminList: 300_000,
} as const;

/**
 * Options for creating a SquadServer instance.
 */
export interface SquadServerOptions {
  /** Unique identifier for this server instance. */
  readonly id: string;

  /** Human-readable server name. */
  readonly name?: string | undefined;

  /** RCON configuration. */
  readonly rcon: {
    readonly host: string;
    readonly port: number;
    readonly password: string;
  };

  /** Log reader configuration. */
  readonly logReader: {
    readonly mode: 'tail' | 'ftp' | 'sftp';
    readonly logDir: string;
    readonly filename?: string | undefined;
    readonly host?: string | undefined;
    readonly port?: number | undefined;
    readonly user?: string | undefined;
    readonly password?: string | undefined;
  };

  /** Admin list sources. */
  readonly adminLists?: readonly AdminListSource[] | undefined;

  /** Update intervals configuration. */
  readonly updateIntervals?: Partial<UpdateIntervals> | undefined;

  /** Layer history maximum size (default: 20). */
  readonly layerHistorySize?: number | undefined;
}

/**
 * Admin list source configuration.
 */
export interface AdminListSource {
  /** Source type. */
  readonly type: 'local' | 'remote';
  /** Path or URL to the admin list. */
  readonly source: string;
}

// =============================================================================
// State Change Events
// =============================================================================

/**
 * Emitted when a player changes teams.
 */
export interface PlayerTeamChangeEvent {
  /** The player who changed teams. */
  readonly player: Player;
  /** Previous team ID (null if wasn't on a team). */
  readonly oldTeamID: TeamID | null;
  /** New team ID (null if left team). */
  readonly newTeamID: TeamID | null;
  /** Timestamp of the change. */
  readonly time: Date;
}

/**
 * Emitted when a player changes squads.
 */
export interface PlayerSquadChangeEvent {
  /** The player who changed squads. */
  readonly player: Player;
  /** Previous squad ID (null if wasn't in a squad). */
  readonly oldSquadID: SquadID | null;
  /** New squad ID (null if left squad). */
  readonly newSquadID: SquadID | null;
  /** Timestamp of the change. */
  readonly time: Date;
}

/**
 * Emitted when a player's role changes.
 */
export interface PlayerRoleChangeEvent {
  /** The player whose role changed. */
  readonly player: Player;
  /** Previous role (null if none). */
  readonly oldRole: string | null;
  /** New role. */
  readonly newRole: string | null;
  /** Timestamp of the change. */
  readonly time: Date;
}

/**
 * Emitted when a player becomes or stops being squad leader.
 */
export interface PlayerLeaderChangeEvent {
  /** The player whose leader status changed. */
  readonly player: Player;
  /** Previous squad leader status. */
  readonly wasLeader: boolean;
  /** New squad leader status. */
  readonly isLeader: boolean;
  /** Timestamp of the change. */
  readonly time: Date;
}

// =============================================================================
// Server Lifecycle Events
// =============================================================================

/**
 * Emitted when the server is starting up.
 */
export interface ServerStartingEvent {
  /** Timestamp. */
  readonly time: Date;
}

/**
 * Emitted when the server has finished starting and is ready.
 */
export interface ServerReadyEvent {
  /** Timestamp. */
  readonly time: Date;
  /** Current player count. */
  readonly playerCount: number;
  /** Current layer if known. */
  readonly currentLayer: Layer | null;
}

/**
 * Emitted when the server is stopping.
 */
export interface ServerStoppingEvent {
  /** Timestamp. */
  readonly time: Date;
  /** Reason for stopping. */
  readonly reason: string;
}

/**
 * Emitted when the server has fully stopped.
 */
export interface ServerStoppedEvent {
  /** Timestamp. */
  readonly time: Date;
}

/**
 * Emitted when a server error occurs.
 */
export interface ServerErrorEvent {
  /** Timestamp. */
  readonly time: Date;
  /** Error that occurred. */
  readonly error: Error;
  /** Whether the error is recoverable. */
  readonly recoverable: boolean;
}

// =============================================================================
// Server Event Map
// =============================================================================

/**
 * Additional events emitted by SquadServer beyond the base event map.
 */
export interface ServerEventExtensions {
  // State change events
  PLAYER_TEAM_CHANGE: PlayerTeamChangeEvent;
  PLAYER_SQUAD_CHANGE: PlayerSquadChangeEvent;
  PLAYER_ROLE_CHANGE: PlayerRoleChangeEvent;
  PLAYER_LEADER_CHANGE: PlayerLeaderChangeEvent;

  // Lifecycle events
  SERVER_STARTING: ServerStartingEvent;
  SERVER_READY: ServerReadyEvent;
  SERVER_STOPPING: ServerStoppingEvent;
  SERVER_STOPPED: ServerStoppedEvent;
  SERVER_ERROR: ServerErrorEvent;
}

/**
 * Complete event map for SquadServer.
 * Combines base Squad events with server-specific events.
 */
export interface ServerEventMap extends SquadEventMap, ServerEventExtensions {}

/**
 * Event type constants for server-specific events.
 */
export const ServerEventType = {
  PLAYER_TEAM_CHANGE: 'PLAYER_TEAM_CHANGE',
  PLAYER_SQUAD_CHANGE: 'PLAYER_SQUAD_CHANGE',
  PLAYER_ROLE_CHANGE: 'PLAYER_ROLE_CHANGE',
  PLAYER_LEADER_CHANGE: 'PLAYER_LEADER_CHANGE',
  SERVER_STARTING: 'SERVER_STARTING',
  SERVER_READY: 'SERVER_READY',
  SERVER_STOPPING: 'SERVER_STOPPING',
  SERVER_STOPPED: 'SERVER_STOPPED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ServerEventType = (typeof ServerEventType)[keyof typeof ServerEventType];

// =============================================================================
// Admin Types
// =============================================================================

/**
 * Resolved admin with their permissions.
 */
export interface ResolvedAdmin {
  /** Admin's player identifier (Steam ID or EOS ID). */
  readonly id: SteamID | EOSID;
  /** Set of permission strings. */
  readonly permissions: ReadonlySet<string>;
}

/**
 * Parsed admin group definition.
 */
export interface AdminGroup {
  /** Group name. */
  readonly name: string;
  /** Permissions assigned to this group. */
  readonly permissions: readonly string[];
}

/**
 * Parsed admin list data.
 */
export interface ParsedAdminList {
  /** Map of group name to group definition. */
  readonly groups: ReadonlyMap<string, AdminGroup>;
  /** Map of admin ID to group name. */
  readonly admins: ReadonlyMap<string, string>;
}

// =============================================================================
// Server Info Types
// =============================================================================

/**
 * Server information snapshot.
 */
export interface ServerInfo {
  /** Server name. */
  readonly name: string;
  /** Maximum player slots. */
  readonly maxPlayers: number;
  /** Current player count. */
  readonly playerCount: number;
  /** Number in public queue. */
  readonly publicQueue: number;
  /** Number in reserved queue. */
  readonly reserveQueue: number;
  /** Current layer name. */
  readonly currentLayer: string;
  /** Next layer name. */
  readonly nextLayer: string;
  /** Team 1 faction. */
  readonly teamOne: string;
  /** Team 2 faction. */
  readonly teamTwo: string;
}

// =============================================================================
// Service State Types
// =============================================================================

/**
 * Player state change details.
 */
export interface PlayerStateChange {
  /** The player. */
  readonly player: Player;
  /** Type of change. */
  readonly type: 'added' | 'removed' | 'updated';
  /** Previous player state (for updates). */
  readonly previous?: Readonly<Player> | undefined;
}

/**
 * Squad state change details.
 */
export interface SquadStateChange {
  /** The squad. */
  readonly squad: Squad;
  /** Type of change. */
  readonly type: 'created' | 'disbanded' | 'updated';
  /** Previous squad state (for updates). */
  readonly previous?: Readonly<Squad> | undefined;
}

/**
 * Layer state change details.
 */
export interface LayerStateChange {
  /** Type of change. */
  readonly type: 'layer_changed' | 'next_layer_set';
  /** New layer. */
  readonly layer: Layer;
  /** Previous layer (for layer changes). */
  readonly previous?: Layer | undefined;
}
