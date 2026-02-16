/**
 * @squadscript/types
 *
 * API response body types (DTOs) for all endpoints.
 *
 * @module
 */

// =============================================================================
// Auth
// =============================================================================

export interface AuthTokenResponse {
  readonly token: string;
  readonly expiresAt: string;
  readonly user: DashboardUserDTO;
}

// =============================================================================
// Server Status
// =============================================================================

export interface ServerStateSnapshot {
  readonly status: 'online' | 'offline' | 'starting' | 'stopping';
  readonly info: ServerInfoDTO | null;
  readonly currentLayer: LayerDTO | null;
  readonly nextLayer: LayerDTO | null;
  readonly players: readonly PlayerDTO[];
  readonly squads: readonly SquadDTO[];
  readonly metrics: MetricsSnapshot;
  readonly uptime: number;
  readonly rconConnected: boolean;
}

export interface ServerInfoDTO {
  readonly name: string;
  readonly maxPlayers: number;
  readonly playerCount: number;
  readonly publicQueue: number;
  readonly reserveQueue: number;
  readonly currentLayer: string;
  readonly nextLayer: string;
  readonly teamOne: string;
  readonly teamTwo: string;
}

export interface LayerDTO {
  readonly name: string;
  readonly level: string;
  readonly gameMode: string;
  readonly version: string | null;
}

// =============================================================================
// Players
// =============================================================================

export interface PlayerDTO {
  readonly eosId: string;
  readonly steamId: string | null;
  readonly playerId: number;
  readonly name: string;
  readonly teamId: number | null;
  readonly squadId: number | null;
  readonly squadName: string | null;
  readonly isSquadLeader: boolean;
  readonly role: string | null;
}

// =============================================================================
// Squads
// =============================================================================

export interface SquadDTO {
  readonly squadId: number;
  readonly teamId: number;
  readonly name: string;
  readonly size: number;
  readonly locked: boolean;
  readonly creatorName: string;
  readonly creatorEosId: string;
}

// =============================================================================
// Metrics
// =============================================================================

export interface MetricsSnapshot {
  readonly playerCount: number;
  readonly tickRate: number | null;
  readonly cpuPercent: number | null;
  readonly memoryMb: number;
  readonly publicQueue: number;
  readonly reserveQueue: number;
  readonly uptime: number;
  readonly timestamp: string;
}

// =============================================================================
// Plugins
// =============================================================================

export interface PluginDTO {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly state: string;
  readonly options: Record<string, unknown>;
  readonly optionsSpec: readonly PluginOptionSpecDTO[];
}

export interface PluginOptionSpecDTO {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
  readonly default: unknown;
}

// =============================================================================
// Logs
// =============================================================================

export interface LogEntryDTO {
  readonly id: number;
  readonly type: string;
  readonly message: string;
  readonly player: string | null;
  readonly playerEos: string | null;
  readonly details: Record<string, unknown> | null;
  readonly createdAt: string;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

// =============================================================================
// Users
// =============================================================================

export interface DashboardUserDTO {
  readonly id: string;
  readonly username: string;
  readonly role: string;
  readonly createdAt: string;
}

export interface RoleDTO {
  readonly name: string;
  readonly permissions: readonly string[];
}

// =============================================================================
// RCON
// =============================================================================

export interface RconCommandResultDTO {
  readonly command: string;
  readonly response: string;
  readonly executedAt: string;
}

export interface RconHistoryEntryDTO {
  readonly command: string;
  readonly response: string;
  readonly executedBy: string;
  readonly executedAt: string;
}

// =============================================================================
// Notifications
// =============================================================================

export interface NotificationDTO {
  readonly id: number;
  readonly type: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly title: string;
  readonly message: string | null;
  readonly read: boolean;
  readonly createdAt: string;
}

// =============================================================================
// Audit Log
// =============================================================================

export interface AuditLogEntryDTO {
  readonly id: number;
  readonly userId: string | null;
  readonly action: string;
  readonly target: string | null;
  readonly details: Record<string, unknown> | null;
  readonly createdAt: string;
}

// =============================================================================
// Config
// =============================================================================

export interface ServerConfigDTO {
  readonly name: string;
  readonly settings: Record<string, unknown>;
}

export interface MapRotationDTO {
  readonly layers: readonly string[];
}

// =============================================================================
// Ban History
// =============================================================================

export interface BanHistoryEntryDTO {
  readonly id: number;
  readonly steamId: string | null;
  readonly eosId: string | null;
  readonly name: string | null;
  readonly reason: string;
  readonly duration: number;
  readonly adminName: string | null;
  readonly createdAt: string;
  readonly expiresAt: string | null;
}
