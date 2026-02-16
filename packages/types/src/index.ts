/**
 * @squadscript/types
 *
 * Shared TypeScript types and interfaces for SquadScript.
 *
 * This package contains all the core type definitions used across
 * SquadScript packages and plugins. It has no runtime dependencies
 * and is designed to be a pure types package.
 *
 * @packageDocumentation
 */

// =============================================================================
// Branded Types
// =============================================================================
export type {
  SteamID,
  EOSID,
  PlayerID,
  PlayerController,
  TeamID,
  SquadID,
  ChainID,
} from './branded.js';

export {
  asSteamID,
  asEOSID,
  asPlayerID,
  asPlayerController,
  asTeamID,
  asSquadID,
  asChainID,
  isSteamIDString,
  isEOSIDString,
} from './branded.js';

// =============================================================================
// Result Type
// =============================================================================
export type { Result } from './result.js';

export {
  Ok,
  Err,
  tryCatch,
  tryCatchSync,
  unwrapOr,
  unwrapOrElse,
  mapResult,
  mapError,
  flatMapResult,
  isOk,
  isErr,
} from './result.js';

// =============================================================================
// Domain Types
// =============================================================================
export type {
  Player,
  PartialPlayer,
  AnyPlayerID,
  PlayerConnection,
  PlayerWithConnection,
} from './player.js';

export { createEmptyPlayer, createPartialPlayer } from './player.js';

export type { Squad, RconSquadInfo } from './squad.js';

export { createSquad } from './squad.js';

export type { Team } from './team.js';

export { TEAM_ONE, TEAM_TWO, createTeam } from './team.js';

export type {
  GameMode,
  Layer,
  LayerState,
  RconLayerInfo,
} from './layer.js';

export {
  parseLayerName,
  createLayerFromRcon,
  createEmptyLayerState,
} from './layer.js';

// =============================================================================
// Events
// =============================================================================
export {
  EventType,
  type BaseEvent,
  type SquadEventMap,
  type EventData,
  type EventHandler,
  // Player events
  type PlayerConnectedEvent,
  type PlayerDisconnectedEvent,
  type PlayerJoinSucceededEvent,
  type PlayerPossessEvent,
  type PlayerUnpossessEvent,
  // Combat events
  type PlayerDamagedEvent,
  type PlayerWoundedEvent,
  type PlayerDiedEvent,
  type PlayerRevivedEvent,
  type DeployableDamagedEvent,
  // Chat events
  type ChatChannel,
  type ChatMessageEvent,
  type ChatCommandEvent,
  parseChatCommand,
  // Game events
  type NewGameEvent,
  type RoundEndedEvent,
  type RoundTicketsEvent,
  type RoundWinnerEvent,
  type ServerTickRateEvent,
  // Admin events
  type AdminBroadcastEvent,
  type AdminCameraEvent,
  type PlayerKickedEvent,
  type PlayerWarnedEvent,
  type PlayerBannedEvent,
  type SquadCreatedEvent,
  // RCON events
  type RconConnectedEvent,
  type RconDisconnectedEvent,
  type RconErrorEvent,
} from './events/index.js';

// =============================================================================
// RCON Types
// =============================================================================
export {
  type RconCommands,
  type RconPlayer,
  type RconSquad,
  type RconServerInfo,
  PacketType,
  PacketID,
  MAXIMUM_PACKET_SIZE,
  MINIMUM_PACKET_SIZE,
  HEADER_SIZE,
  type RconPacket,
  type EncodedPacket,
} from './rcon/index.js';

// =============================================================================
// Plugin Types
// =============================================================================
export {
  type PluginLifecycle,
  type PluginMeta,
  type PluginState,
  type OptionType,
  type OptionSpec,
  type OptionsSpecification,
  type OptionsSpec,
  type ResolvedOptions,
  type InferOptionType,
  type Unsubscribe,
  type PluginEventEmitter,
  type PluginRconExecutor,
  type ServerStateReader,
  type PluginLogger,
  type PluginContext,
  type Connector,
  type DiscordMessageOptions,
  type DiscordConnector,
  type DatabaseQueryResult,
  type DatabaseConnector,
  defineOption,
  defineOptions,
} from './plugin/index.js';

// =============================================================================
// Config Types
// =============================================================================
export type {
  LogReaderMode,
  FtpConfig,
  LogReaderConfig,
  RconConfig,
  ServerConfig,
  AdminListSourceType,
  AdminListSource,
  ConnectorConfig,
  PluginConfig,
  VerbosityConfig,
} from './config/index.js';

// =============================================================================
// API Types
// =============================================================================
export type {
  // Requests
  LoginRequest,
  WarnPlayerRequest,
  KickPlayerRequest,
  BanPlayerRequest,
  MessagePlayerRequest,
  ExecuteRconRequest,
  BroadcastRequest,
  ChangeLayerRequest,
  SetNextLayerRequest,
  UpdatePluginRequest,
  AddPluginRequest,
  UpdateServerConfigRequest,
  UpdateRulesRequest,
  UpdateAdminsRequest,
  UpdateRotationRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateRoleRequest,
  UpdateNotificationSettingsRequest,
  LogsQueryParams,
  MetricsHistoryParams,

  // Responses
  AuthTokenResponse,
  ServerStateSnapshot,
  ServerInfoDTO,
  LayerDTO,
  PlayerDTO,
  SquadDTO,
  MetricsSnapshot,
  PluginDTO,
  PluginOptionSpecDTO,
  LogEntryDTO,
  PaginatedResponse,
  DashboardUserDTO,
  RoleDTO,
  RconCommandResultDTO,
  RconHistoryEntryDTO,
  NotificationDTO,
  AuditLogEntryDTO,
  ServerConfigDTO,
  MapRotationDTO,
  BanHistoryEntryDTO,

  // WebSocket
  WSChannel,
  WSClientMessage,
  WSServerMessage,
  WSPlayerEvent,
  WSChatEvent,
  WSKillEvent,
  WSGameEvent,
  WSAdminEvent,
  WSPluginEvent,
  WSLogEvent,
} from './api/index.js';

// =============================================================================
// Dashboard Types
// =============================================================================
export type {
  DashboardRole,
  DashboardUser,
  MetricsDataPoint,
  NotificationSeverity,
  NotificationType,
  Notification,
  AuditAction,
  AuditLogEntry,
} from './dashboard/index.js';
