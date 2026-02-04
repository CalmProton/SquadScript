/**
 * @squadscript/config
 *
 * Schema exports.
 *
 * @module
 */

// Server schemas
export {
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
} from './server.js';

// Plugin schemas
export {
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
} from './plugin.js';
