/**
 * @squadscript/types
 *
 * Plugin module - exports all plugin-related types.
 *
 * @module
 */

// Lifecycle types
export type {
  PluginLifecycle,
  PluginMeta,
  PluginState,
} from './lifecycle.js';

// Options types
export {
  type OptionType,
  type OptionSpec,
  type OptionsSpecification,
  type OptionsSpec,
  type ResolvedOptions,
  type InferOptionType,
  defineOption,
  defineOptions,
} from './options.js';

// Context types
export type {
  Unsubscribe,
  EventHandler,
  PluginEventEmitter,
  PluginRconExecutor,
  ServerStateReader,
  PluginLogger,
  PluginContext,
} from './context.js';

// Connector types
export type {
  Connector,
  DiscordMessageOptions,
  DiscordConnector,
  DatabaseQueryResult,
  DatabaseConnector,
  ConnectorConfig,
} from './connector.js';
