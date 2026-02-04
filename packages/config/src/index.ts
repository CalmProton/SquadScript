/**
 * @squadscript/config
 *
 * Configuration loading and validation for SquadScript.
 *
 * This package provides:
 * - Zod schemas for server and plugin configuration
 * - Configuration file loading (JSON, JSON5)
 * - Validation with detailed error messages
 * - Type-safe configuration access
 *
 * @example
 * ```typescript
 * import { ConfigLoader, ServerConfigSchema } from '@squadscript/config';
 *
 * // Load from file
 * const loader = new ConfigLoader({ logger });
 * const result = await loader.loadServerConfig('./config.json');
 *
 * if (result.ok) {
 *   console.log('Server:', result.value.name);
 *   console.log('RCON Port:', result.value.rcon.port);
 * } else {
 *   console.error(result.error.formatDetails());
 * }
 * ```
 *
 * @packageDocumentation
 */

// Errors
export {
  type ConfigErrorCode,
  type ValidationErrorDetail,
  ConfigError,
} from './errors.js';

// Schemas
export {
  // Server schemas
  FtpConfigSchema,
  type FtpConfig,
  LogReaderModeSchema,
  type LogReaderMode,
  LogReaderConfigSchema,
  type LogReaderConfig,
  RconConfigSchema,
  type RconConfig,
  AdminListSourceTypeSchema,
  type AdminListSourceType,
  AdminListSourceSchema,
  type AdminListSource,
  ConnectorConfigSchema,
  type ConnectorConfig,
  PluginConfigSchema,
  type PluginConfig,
  VerbosityConfigSchema,
  type VerbosityConfig,
  ServerConfigSchema,
  type ServerConfig,
  RootConfigSchema,
  type RootConfig,
  DiscordConnectorSchema,
  // Plugin schemas
  BasePluginOptionsSchema,
  ChatCommandsOptionsSchema,
  type ChatCommandsOptions,
  AutoTkWarnOptionsSchema,
  type AutoTkWarnOptions,
  SeedingModeOptionsSchema,
  type SeedingModeOptions,
  DiscordChatOptionsSchema,
  type DiscordChatOptions,
  IntervalledBroadcastsOptionsSchema,
  type IntervalledBroadcastsOptions,
  PluginOptionSchemas,
  getPluginOptionsSchema,
} from './schemas/index.js';

// Validator
export {
  type ValidationResult,
  validate,
  validateOrThrow,
  createValidator,
  mergeValidationResults,
} from './validator.js';

// Loader
export {
  type ConfigLoaderOptions,
  type ConfigFormat,
  ConfigLoader,
  createConfigLoader,
  validateConfig,
} from './loader.js';
