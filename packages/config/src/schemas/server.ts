/**
 * @squadscript/config
 *
 * Server configuration Zod schema.
 *
 * @module
 */

import { z } from 'zod';

// =============================================================================
// FTP Configuration Schema
// =============================================================================

/**
 * FTP/SFTP connection configuration schema.
 */
export const FtpConfigSchema = z.object({
  /** FTP/SFTP host address. */
  host: z.string().min(1, 'Host is required'),

  /** FTP/SFTP port. */
  port: z.number().int().positive().default(21),

  /** Username for authentication. */
  username: z.string().min(1, 'Username is required'),

  /** Password for authentication. */
  password: z.string(),

  /** Whether to use secure connection. */
  secure: z.boolean().optional(),
});

export type FtpConfig = z.output<typeof FtpConfigSchema>;

// =============================================================================
// Log Reader Configuration Schema
// =============================================================================

/**
 * Log reader mode.
 */
export const LogReaderModeSchema = z.enum(['tail', 'ftp', 'sftp']);

export type LogReaderMode = z.output<typeof LogReaderModeSchema>;

/**
 * Log reader configuration schema.
 */
export const LogReaderConfigSchema = z.object({
  /** Reader mode. */
  mode: LogReaderModeSchema.default('tail'),

  /** Path to log directory. */
  logDir: z.string().min(1, 'Log directory is required'),

  /** Specific log filename (optional). */
  filename: z.string().optional(),

  /** FTP configuration (required for ftp/sftp modes). */
  ftp: FtpConfigSchema.optional(),
}).refine(
  (data) => {
    // FTP config is required for ftp/sftp modes
    if (data.mode === 'ftp' || data.mode === 'sftp') {
      return data.ftp !== undefined;
    }
    return true;
  },
  {
    message: 'FTP configuration is required when mode is "ftp" or "sftp"',
    path: ['ftp'],
  },
);

export type LogReaderConfig = z.output<typeof LogReaderConfigSchema>;

// =============================================================================
// RCON Configuration Schema
// =============================================================================

/**
 * RCON connection configuration schema.
 */
export const RconConfigSchema = z.object({
  /** RCON host address. */
  host: z.string().min(1, 'RCON host is required'),

  /** RCON port. */
  port: z.number().int().positive().default(21114),

  /** RCON password. */
  password: z.string().min(1, 'RCON password is required'),

  /** Auto-reconnect on disconnect. */
  autoReconnect: z.boolean().default(true),

  /** Delay between reconnection attempts (ms). */
  autoReconnectDelay: z.number().int().positive().default(5000),

  /** Maximum reconnection attempts (0 = infinite). */
  maxReconnectAttempts: z.number().int().min(0).default(0),

  /** Connection timeout (ms). */
  timeout: z.number().int().positive().default(10000),
});

export type RconConfig = z.output<typeof RconConfigSchema>;

// =============================================================================
// Admin List Configuration Schema
// =============================================================================

/**
 * Admin list source type.
 */
export const AdminListSourceTypeSchema = z.enum(['local', 'remote', 'ftp']);

export type AdminListSourceType = z.output<typeof AdminListSourceTypeSchema>;

/**
 * Admin list source configuration schema.
 */
export const AdminListSourceSchema = z.object({
  /** Source type. */
  type: AdminListSourceTypeSchema,

  /** Path or URL to the admin list. */
  source: z.string().min(1, 'Source is required'),

  /** Refresh interval in milliseconds (for remote/ftp). */
  refreshInterval: z.number().int().positive().optional(),
});

export type AdminListSource = z.output<typeof AdminListSourceSchema>;

// =============================================================================
// Connector Configuration Schema
// =============================================================================

/**
 * Discord connector configuration schema.
 */
export const DiscordConnectorSchema = z.object({
  type: z.literal('discord'),
  token: z.string().min(1, 'Discord token is required'),
  guildId: z.string().optional(),
});

/**
 * Generic connector configuration schema.
 */
export const ConnectorConfigSchema = z.record(
  z.string(),
  z.union([
    DiscordConnectorSchema,
    z.object({
      type: z.string(),
    }).passthrough(),
  ]),
);

export type ConnectorConfig = z.output<typeof ConnectorConfigSchema>;

// =============================================================================
// Plugin Configuration Schema
// =============================================================================

/**
 * Plugin configuration schema.
 */
export const PluginConfigSchema = z.object({
  /** Plugin name/identifier. */
  plugin: z.string().min(1, 'Plugin name is required'),

  /** Whether the plugin is enabled. */
  enabled: z.boolean().default(true),

  /** Plugin-specific options. */
  options: z.record(z.string(), z.unknown()).optional(),

  /** Connectors to inject. */
  connectors: z.record(z.string(), z.string()).optional(),
});

export type PluginConfig = z.output<typeof PluginConfigSchema>;

// =============================================================================
// Verbosity Configuration Schema
// =============================================================================

/**
 * Verbosity configuration schema.
 */
export const VerbosityConfigSchema = z.record(
  z.string(),
  z.number().int().min(0).max(5),
).default({});

export type VerbosityConfig = z.output<typeof VerbosityConfigSchema>;

// =============================================================================
// Server Configuration Schema
// =============================================================================

/**
 * Complete server configuration schema.
 *
 * This schema validates the entire server configuration including
 * RCON, log reader, admin lists, connectors, and plugins.
 */
export const ServerConfigSchema = z.object({
  /** Unique server ID. */
  id: z.number().int().positive(),

  /** Server display name (optional). */
  name: z.string().optional(),

  /** RCON configuration. */
  rcon: RconConfigSchema,

  /** Log reader configuration. */
  logReader: LogReaderConfigSchema,

  /** Admin list sources (optional). */
  adminLists: z.array(AdminListSourceSchema).optional(),

  /** Connectors configuration (optional). */
  connectors: ConnectorConfigSchema.optional(),

  /** Plugins configuration (optional). */
  plugins: z.array(PluginConfigSchema).optional(),

  /** Logging verbosity settings (optional). */
  verbosity: VerbosityConfigSchema.optional(),
});

export type ServerConfig = z.output<typeof ServerConfigSchema>;

// =============================================================================
// Multi-Server Configuration Schema
// =============================================================================

/**
 * Root configuration schema (for multi-server setups).
 */
export const RootConfigSchema = z.object({
  /** Array of server configurations. */
  servers: z.array(ServerConfigSchema).min(1, 'At least one server is required'),

  /** Global connectors (shared across servers). */
  connectors: ConnectorConfigSchema.optional(),

  /** Global verbosity settings. */
  verbosity: VerbosityConfigSchema.optional(),
});

export type RootConfig = z.output<typeof RootConfigSchema>;
