/**
 * @squadscript/server
 *
 * Plugin system module - exports all plugin-related components.
 *
 * The plugin system provides:
 * - BasePlugin: Abstract base class for plugins
 * - PluginManager: Orchestrates plugin lifecycle
 * - PluginLoader: Loads plugin classes from various sources
 * - PluginRunner: Executes plugin lifecycle methods
 * - OptionsResolver: Validates and resolves plugin options
 * - SubscriptionManager: Tracks resources for automatic cleanup
 * - ConnectorRegistry: Manages shared connectors
 * - Error handling: Circuit breaker pattern for plugin isolation
 *
 * @module
 */

// Base plugin class
export { BasePlugin, type SquadPluginContext } from './base-plugin.js';

// Plugin manager
export {
  PluginManager,
  type PluginConfig,
  type PluginServerInterface,
  type PluginManagerConfig,
  type MountAllResult,
} from './manager.js';

// Plugin loader
export {
  PluginLoader,
  PluginLoadError,
  type PluginClass,
  type LoadedPlugin,
  type MetaValidationResult,
  type PluginLoaderConfig,
} from './loader.js';

// Plugin runner
export {
  PluginRunner,
  type PluginInstance,
  type LifecycleResult,
  type PluginRunnerConfig,
} from './runner.js';

// Options resolver
export {
  OptionsResolver,
  OptionsValidationError,
  type OptionValidationError,
  type ConnectorResolver,
  type OptionsResolverConfig,
} from './options-resolver.js';

// Subscription manager
export { SubscriptionManager } from './subscription-manager.js';

// Connector registry
export {
  ConnectorRegistry,
  type ConnectorFactory,
  type ConnectorRegistryConfig,
} from './connector-registry.js';

// Error handling
export {
  PluginError,
  PluginErrorType,
  PluginCircuitBreaker,
  PluginErrorHandler,
  CircuitState,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_ERROR_HANDLER_CONFIG,
  type CircuitBreakerConfig,
  type ErrorHandlerConfig,
} from './error-handler.js';
