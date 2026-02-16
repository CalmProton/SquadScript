/**
 * @squadscript/types
 *
 * API request body types for all endpoints.
 *
 * @module
 */

// =============================================================================
// Auth
// =============================================================================

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

// =============================================================================
// Player Actions
// =============================================================================

export interface WarnPlayerRequest {
  readonly message: string;
}

export interface KickPlayerRequest {
  readonly reason: string;
}

export interface BanPlayerRequest {
  readonly duration: number;
  readonly reason: string;
}

export interface MessagePlayerRequest {
  readonly message: string;
}

// =============================================================================
// RCON
// =============================================================================

export interface ExecuteRconRequest {
  readonly command: string;
}

export interface BroadcastRequest {
  readonly message: string;
}

// =============================================================================
// Layers
// =============================================================================

export interface ChangeLayerRequest {
  readonly layer: string;
}

export interface SetNextLayerRequest {
  readonly layer: string;
}

// =============================================================================
// Plugins
// =============================================================================

export interface UpdatePluginRequest {
  readonly enabled?: boolean | undefined;
  readonly options?: Record<string, unknown> | undefined;
}

export interface AddPluginRequest {
  readonly name: string;
  readonly enabled?: boolean | undefined;
  readonly options?: Record<string, unknown> | undefined;
}

// =============================================================================
// Config
// =============================================================================

export interface UpdateServerConfigRequest {
  readonly name?: string | undefined;
  readonly settings?: Record<string, unknown> | undefined;
}

export interface UpdateRulesRequest {
  readonly content: string;
}

export interface UpdateAdminsRequest {
  readonly content: string;
}

export interface UpdateRotationRequest {
  readonly layers: readonly string[];
}

// =============================================================================
// Users
// =============================================================================

export interface CreateUserRequest {
  readonly username: string;
  readonly password: string;
  readonly role: string;
}

export interface UpdateUserRequest {
  readonly role?: string | undefined;
  readonly password?: string | undefined;
}

export interface UpdateRoleRequest {
  readonly permissions: readonly string[];
}

// =============================================================================
// Notifications
// =============================================================================

export interface UpdateNotificationSettingsRequest {
  readonly settings: Record<string, unknown>;
}

// =============================================================================
// Logs Query
// =============================================================================

export interface LogsQueryParams {
  readonly type?: string | undefined;
  readonly player?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

// =============================================================================
// Metrics Query
// =============================================================================

export interface MetricsHistoryParams {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly interval?: string | undefined;
}
