/**
 * @squadscript/server
 *
 * Core SquadServer orchestrator for SquadScript.
 *
 * This package provides the main SquadServer class that:
 * - Manages RCON client and LogParser instances
 * - Maintains server state (players, squads, teams, layers, admins)
 * - Routes and enriches events from RCON/LogParser
 * - Handles periodic data refresh
 * - Exposes a clean API for querying server state
 *
 * @example
 * ```typescript
 * import { SquadServer } from '@squadscript/server';
 *
 * const server = new SquadServer({
 *   id: 'server-1',
 *   name: 'My Squad Server',
 *   rcon: { host: '127.0.0.1', port: 21114, password: 'secret' },
 *   logReader: { mode: 'tail', logDir: '/path/to/logs' },
 * });
 *
 * server.on('PLAYER_CONNECTED', (event) => {
 *   console.log(`Player connected: ${event.player.eosID}`);
 * });
 *
 * server.on('CHAT_MESSAGE', (event) => {
 *   console.log(`${event.playerName}: ${event.message}`);
 * });
 *
 * await server.start();
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Main Server
// =============================================================================

export { SquadServer } from './server.js';

// =============================================================================
// Types
// =============================================================================

export {
  // Server state
  ServerState,
  ServerEventType,

  // Configuration types
  type SquadServerOptions,
  type UpdateIntervals,
  type AdminListSource,
  DEFAULT_UPDATE_INTERVALS,

  // Event types
  type ServerEventMap,
  type ServerEventExtensions,
  type PlayerTeamChangeEvent,
  type PlayerSquadChangeEvent,
  type PlayerRoleChangeEvent,
  type PlayerLeaderChangeEvent,
  type ServerStartingEvent,
  type ServerReadyEvent,
  type ServerStoppingEvent,
  type ServerStoppedEvent,
  type ServerErrorEvent,

  // State types
  type ResolvedAdmin,
  type AdminGroup,
  type ParsedAdminList,
  type ServerInfo,
  type PlayerStateChange,
  type SquadStateChange,
  type LayerStateChange,
} from './types.js';

// =============================================================================
// Errors
// =============================================================================

export {
  ErrorCode,
  SquadServerError,
  ConnectionError,
  AuthenticationError,
  InvalidStateError,
  StateUpdateError,
  AdminListError,
  LayerError,
  CommandError,
} from './errors.js';

// =============================================================================
// Constants
// =============================================================================

export { DefaultIntervals, LayerDefaults, Timings } from './constants.js';

// =============================================================================
// Events
// =============================================================================

export { TypedEventEmitter } from './events/index.js';

// =============================================================================
// Scheduler
// =============================================================================

export {
  UpdateScheduler,
  type UpdateTask,
  type TaskStats,
  type UpdateSchedulerOptions,
} from './scheduler/index.js';

// =============================================================================
// Services
// =============================================================================

export {
  PlayerService,
  type PlayerServiceOptions,
  SquadService,
  type SquadServiceOptions,
  LayerService,
  type LayerServiceOptions,
  type LayerHistoryEntry,
  AdminService,
  type AdminServiceOptions,
} from './services/index.js';

// =============================================================================
// Plugin System
// =============================================================================

export {
  // Base plugin
  BasePlugin,
  type SquadPluginContext,

  // Manager
  PluginManager,
  type PluginConfig,
  type PluginServerInterface,
  type PluginManagerConfig,
  type MountAllResult,

  // Loader
  PluginLoader,
  PluginLoadError,
  type PluginClass,
  type LoadedPlugin,
  type MetaValidationResult,
  type PluginLoaderConfig,

  // Runner
  PluginRunner,
  type PluginInstance,
  type LifecycleResult,
  type PluginRunnerConfig,

  // Options
  OptionsResolver,
  OptionsValidationError,
  type OptionValidationError,
  type ConnectorResolver,
  type OptionsResolverConfig,

  // Subscriptions
  SubscriptionManager,

  // Connectors
  ConnectorRegistry,
  type ConnectorFactory,
  type ConnectorRegistryConfig,

  // Errors
  PluginError,
  PluginErrorType,
  PluginCircuitBreaker,
  PluginErrorHandler,
  CircuitState,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_ERROR_HANDLER_CONFIG,
  type CircuitBreakerConfig,
  type ErrorHandlerConfig,
} from './plugins/index.js';

