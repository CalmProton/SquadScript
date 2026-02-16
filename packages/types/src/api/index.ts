/**
 * @squadscript/types
 *
 * API types barrel export.
 *
 * @module
 */

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
} from './requests.js';

export type {
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
} from './responses.js';

export type {
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
} from './websocket.js';
